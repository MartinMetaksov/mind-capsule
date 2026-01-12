use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{command, AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

const WORKSPACE_META: &str = "workspace.json";
const VERTEX_META: &str = "vertex.json";
const CHILDREN_DIR: &str = "children";
const REGISTRY_FILE: &str = "workspace_registry.json";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
  pub id: String,
  pub name: String,
  pub path: String,
  pub purpose: Option<String>,
  pub created_at: String,
  pub updated_at: String,
  pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChildrenBehavior {
  pub child_kind: String,
  pub display: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VertexPosition {
  pub x: f64,
  pub y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "mode")]
pub enum VertexLayout {
  #[serde(rename = "linear")]
  Linear { order: HashMap<String, f64> },
  #[serde(rename = "canvas")]
  Canvas { positions: HashMap<String, VertexPosition> },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vertex {
  pub id: String,
  pub title: String,
  pub parent_id: Option<String>,
  pub workspace_id: Option<String>,
  pub created_at: String,
  pub updated_at: String,
  pub tags: Vec<String>,
  pub children_behavior: Option<ChildrenBehavior>,
  pub children_layout: Option<VertexLayout>,
  pub default_tab: Option<String>,
  pub is_leaf: Option<bool>,
  pub thumbnail_path: Option<String>,
  pub thumbnail_alt: Option<String>,
}

fn workspace_root(workspace_path: &str) -> Result<PathBuf, String> {
  let p = PathBuf::from(workspace_path);
  if !p.is_absolute() {
    return Err("Workspace path must be an absolute path".into());
  }
  Ok(p)
}

fn app_registry_path(app: &AppHandle) -> Result<PathBuf, String> {
  let mut dir = app
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())?;
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  dir.push(REGISTRY_FILE);
  Ok(dir)
}

fn load_workspace_registry(app: &AppHandle) -> Result<HashMap<String, String>, String> {
  let path = app_registry_path(app)?;
  if !path.exists() {
    return Ok(HashMap::new());
  }
  let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
  serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn save_workspace_registry(app: &AppHandle, registry: &HashMap<String, String>) -> Result<(), String> {
  let path = app_registry_path(app)?;
  let json = serde_json::to_string_pretty(registry).map_err(|e| e.to_string())?;
  fs::write(path, json).map_err(|e| e.to_string())
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
  let json = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
  fs::write(path, json).map_err(|e| e.to_string())
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, String> {
  let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
  serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn workspace_meta_path(root: &Path) -> PathBuf {
  root.join(WORKSPACE_META)
}

fn vertex_meta_path(root: &Path) -> PathBuf {
  root.join(VERTEX_META)
}

fn vertex_children_dir(root: &Path) -> PathBuf {
  root.join(CHILDREN_DIR)
}

fn ensure_workspace_meta(root: &Path, workspace: &Workspace) -> Result<(), String> {
  fs::create_dir_all(root).map_err(|e| e.to_string())?;
  write_json(&workspace_meta_path(root), workspace)
}

fn read_vertex_at_dir(dir: &Path) -> Result<Vertex, String> {
  read_json(&vertex_meta_path(dir))
}

fn write_vertex_at_dir(dir: &Path, vertex: &Vertex) -> Result<(), String> {
  fs::create_dir_all(dir).map_err(|e| e.to_string())?;
  fs::create_dir_all(vertex_children_dir(dir)).map_err(|e| e.to_string())?;
  write_json(&vertex_meta_path(dir), vertex)?;
  Ok(())
}

fn collect_vertex_dirs(root: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
  if !root.is_dir() {
    return Ok(());
  }

  let entries = fs::read_dir(root).map_err(|e| e.to_string())?;
  for entry in entries {
    let entry = entry.map_err(|e| e.to_string())?;
    let path = entry.path();
    if !path.is_dir() {
      continue;
    }
    if vertex_meta_path(&path).exists() {
      out.push(path.clone());
    }
    collect_vertex_dirs(&path, out)?;
  }

  Ok(())
}

fn find_vertex_dir(root: &Path, vertex_id: &str) -> Result<Option<PathBuf>, String> {
  let mut dirs = Vec::new();
  collect_vertex_dirs(root, &mut dirs)?;
  for dir in dirs {
    let vertex: Vertex = read_json(&vertex_meta_path(&dir))?;
    if vertex.id == vertex_id {
      return Ok(Some(dir));
    }
  }
  Ok(None)
}

fn workspace_root_for_vertex(
  app: &AppHandle,
  workspace_id: &Option<String>,
) -> Result<PathBuf, String> {
  let id = workspace_id.as_ref().ok_or("Vertex missing workspace_id")?;
  let registry = load_workspace_registry(app)?;
  let path = registry
    .get(id)
    .ok_or_else(|| format!("Workspace {id} is not registered"))?;
  workspace_root(path)
}

#[command]
pub fn fs_create_workspace(app: AppHandle, workspace: Workspace) -> Result<(), String> {
  let root = workspace_root(&workspace.path)?;
  let mut registry = load_workspace_registry(&app)?;
  if registry.contains_key(&workspace.id) {
    return Err(format!("Workspace {} already exists.", workspace.id));
  }
  ensure_workspace_meta(&root, &workspace)?;
  registry.insert(workspace.id.clone(), workspace.path.clone());
  save_workspace_registry(&app, &registry)?;
  Ok(())
}

#[command]
pub fn fs_update_workspace(app: AppHandle, workspace: Workspace) -> Result<(), String> {
  let root = workspace_root(&workspace.path)?;
  let mut registry = load_workspace_registry(&app)?;
  if !registry.contains_key(&workspace.id) {
    return Err(format!("Workspace {} does not exist.", workspace.id));
  }
  ensure_workspace_meta(&root, &workspace)?;
  registry.insert(workspace.id.clone(), workspace.path.clone());
  save_workspace_registry(&app, &registry)?;
  Ok(())
}

#[command]
pub fn fs_remove_workspace(app: AppHandle, workspace_id: String) -> Result<(), String> {
  let mut registry = load_workspace_registry(&app)?;
  let path = registry
    .remove(&workspace_id)
    .ok_or_else(|| format!("Workspace {} does not exist.", workspace_id))?;
  let root = workspace_root(&path)?;
  if root.exists() {
    fs::remove_dir_all(&root).map_err(|e| e.to_string())?;
  }
  save_workspace_registry(&app, &registry)?;
  Ok(())
}

#[command]
pub async fn fs_pick_workspace_dir(app: AppHandle) -> Result<Option<String>, String> {
  let folder = app.dialog().file().blocking_pick_folder();
  let Some(path) = folder else {
    return Ok(None);
  };
  let path = path.into_path().map_err(|e| e.to_string())?;
  Ok(Some(path.to_string_lossy().to_string()))
}

#[command]
pub fn fs_create_vertex(app: AppHandle, mut vertex: Vertex) -> Result<(), String> {
  let workspace_root = workspace_root_for_vertex(&app, &vertex.workspace_id)?;
  let parent_id = vertex.parent_id.clone();

  if vertex.created_at.trim().is_empty() {
    vertex.created_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
  }
  if vertex.updated_at.trim().is_empty() {
    vertex.updated_at = vertex.created_at.clone();
  }

  let dir = if let Some(parent_id) = parent_id {
    let parent_dir = find_vertex_dir(&workspace_root, &parent_id)?
      .ok_or_else(|| format!("Parent vertex {} not found.", parent_id))?;
    vertex_children_dir(&parent_dir).join(&vertex.id)
  } else {
    workspace_root.join(&vertex.id)
  };

  if dir.exists() {
    return Err(format!("Vertex {} already exists.", vertex.id));
  }

  write_vertex_at_dir(&dir, &vertex)?;
  Ok(())
}

#[command]
pub fn fs_get_vertices(app: AppHandle, parent_id: String) -> Result<Vec<Vertex>, String> {
  let registry = load_workspace_registry(&app)?;
  for path in registry.values() {
    let workspace_root = workspace_root(path)?;
    if let Some(parent_dir) = find_vertex_dir(&workspace_root, &parent_id)? {
      let children_dir = vertex_children_dir(&parent_dir);
      if !children_dir.exists() {
        return Ok(vec![]);
      }
      let mut out = Vec::new();
      let entries = fs::read_dir(children_dir).map_err(|e| e.to_string())?;
      for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() && vertex_meta_path(&path).exists() {
          out.push(read_vertex_at_dir(&path)?);
        }
      }
      return Ok(out);
    }
  }
  Ok(vec![])
}

#[command]
pub fn fs_get_root_vertices(app: AppHandle, workspace_id: String) -> Result<Vec<Vertex>, String> {
  let registry = load_workspace_registry(&app)?;
  let path = registry
    .get(&workspace_id)
    .ok_or_else(|| format!("Workspace {} does not exist.", workspace_id))?;
  let workspace_root = workspace_root(path)?;
  let entries = fs::read_dir(&workspace_root).map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for entry in entries {
    let entry = entry.map_err(|e| e.to_string())?;
    let path = entry.path();
    if path.is_dir() && vertex_meta_path(&path).exists() {
      let vertex = read_vertex_at_dir(&path)?;
      if vertex.parent_id.is_none() {
        out.push(vertex);
      }
    }
  }
  Ok(out)
}

#[command]
pub fn fs_get_vertex(app: AppHandle, vertex_id: String) -> Result<Option<Vertex>, String> {
  let registry = load_workspace_registry(&app)?;
  for path in registry.values() {
    let workspace_root = workspace_root(path)?;
    if let Some(dir) = find_vertex_dir(&workspace_root, &vertex_id)? {
      return Ok(Some(read_vertex_at_dir(&dir)?));
    }
  }
  Ok(None)
}

#[command]
pub fn fs_update_vertex(app: AppHandle, mut vertex: Vertex) -> Result<(), String> {
  let workspace_root = workspace_root_for_vertex(&app, &vertex.workspace_id)?;
  let dir = find_vertex_dir(&workspace_root, &vertex.id)?
    .ok_or_else(|| format!("Vertex {} does not exist.", vertex.id))?;
  if vertex.updated_at.trim().is_empty() {
    vertex.updated_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
  }
  write_vertex_at_dir(&dir, &vertex)?;
  Ok(())
}

#[command]
pub fn fs_remove_vertex(app: AppHandle, vertex_id: String) -> Result<(), String> {
  let registry = load_workspace_registry(&app)?;
  for path in registry.values() {
    let workspace_root = workspace_root(path)?;
    if let Some(dir) = find_vertex_dir(&workspace_root, &vertex_id)? {
      fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
      return Ok(());
    }
  }
  Err(format!("Vertex {} does not exist.", vertex_id))
}
