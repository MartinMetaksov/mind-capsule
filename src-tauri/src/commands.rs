use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
struct WorkspaceMeta {
  schemaVersion: u32,
  createdAt: DateTime<Utc>,
  name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
  pub id: String,
  pub title: String,
  pub createdAt: DateTime<Utc>,
  pub updatedAt: DateTime<Utc>,
  pub tags: Vec<String>,
  pub status: String,
}

fn ws_path(workspace: &str) -> Result<PathBuf, String> {
  let p = PathBuf::from(workspace);
  if !p.is_absolute() {
    return Err("workspacePath must be an absolute path".into());
  }
  Ok(p)
}

fn ensure_workspace_structure(root: &Path) -> Result<(), String> {
  if !root.exists() {
    return Err("Workspace folder does not exist".into());
  }

  fs::create_dir_all(root.join("projects")).map_err(|e| e.to_string())?;
  fs::create_dir_all(root.join("trash")).map_err(|e| e.to_string())?;
  fs::create_dir_all(root.join(".cache")).map_err(|e| e.to_string())?;

  let meta_path = root.join("workspace.json");
  if !meta_path.exists() {
    let meta = WorkspaceMeta {
      schemaVersion: 1,
      createdAt: Utc::now(),
      name: "Story Master Workspace".to_string(),
    };
    let json = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(meta_path, json).map_err(|e| e.to_string())?;
  }

  Ok(())
}

fn project_dir(root: &Path, project_id: &str) -> PathBuf {
  root.join("projects").join(project_id)
}

#[command]
pub fn workspace_init_if_missing(workspace_path: String) -> Result<(), String> {
  let root = ws_path(&workspace_path)?;
  ensure_workspace_structure(&root)?;
  Ok(())
}

#[command]
pub fn projects_list(workspace_path: String) -> Result<Vec<Project>, String> {
  let root = ws_path(&workspace_path)?;
  ensure_workspace_structure(&root)?;

  let projects_root = root.join("projects");
  let mut out: Vec<Project> = vec![];

  let entries = fs::read_dir(projects_root).map_err(|e| e.to_string())?;
  for entry in entries {
    let entry = entry.map_err(|e| e.to_string())?;
    let path = entry.path();
    if path.is_dir() {
      let pj = path.join("project.json");
      if pj.exists() {
        let raw = fs::read_to_string(pj).map_err(|e| e.to_string())?;
        if let Ok(p) = serde_json::from_str::<Project>(&raw) {
          out.push(p);
        }
      }
    }
  }

  out.sort_by(|a, b| b.updatedAt.cmp(&a.updatedAt));
  Ok(out)
}

#[command]
pub fn project_create(workspace_path: String, title: String) -> Result<Project, String> {
  let root = ws_path(&workspace_path)?;
  ensure_workspace_structure(&root)?;

  let id = format!("proj_{}", Uuid::new_v4().simple());
  let now = Utc::now();

  let project = Project {
    id: id.clone(),
    title,
    createdAt: now,
    updatedAt: now,
    tags: vec![],
    status: "active".into(),
  };

  let dir = project_dir(&root, &id);
  fs::create_dir_all(dir.join("notes")).map_err(|e| e.to_string())?;
  fs::create_dir_all(dir.join("assets")).map_err(|e| e.to_string())?;
  fs::create_dir_all(dir.join("attachments")).map_err(|e| e.to_string())?;

  fs::write(dir.join("notes").join("overview.md"), "# Overview\n\n").map_err(|e| e.to_string())?;
  fs::write(dir.join("notes").join("ideas.md"), "# Ideas\n\n").map_err(|e| e.to_string())?;

  let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
  fs::write(dir.join("project.json"), json).map_err(|e| e.to_string())?;

  Ok(project)
}

#[command]
pub fn note_read(workspace_path: String, project_id: String, note_name: String) -> Result<String, String> {
  let root = ws_path(&workspace_path)?;
  ensure_workspace_structure(&root)?;

  if note_name.contains('/') || note_name.contains('\\') {
    return Err("Invalid note name".into());
  }

  let p = project_dir(&root, &project_id).join("notes").join(note_name);
  fs::read_to_string(p).map_err(|e| e.to_string())
}

#[command]
pub fn note_write(workspace_path: String, project_id: String, note_name: String, content: String) -> Result<(), String> {
  let root = ws_path(&workspace_path)?;
  ensure_workspace_structure(&root)?;

  if note_name.contains('/') || note_name.contains('\\') {
    return Err("Invalid note name".into());
  }

  let dir = project_dir(&root, &project_id).join("notes");
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  fs::write(dir.join(note_name), content).map_err(|e| e.to_string())?;
  Ok(())
}