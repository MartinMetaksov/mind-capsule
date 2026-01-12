use std::fs;
use std::path::PathBuf;
use tauri::{command, AppHandle};
use tauri_plugin_dialog::DialogExt;

fn workspace_root(workspace_path: &str) -> Result<PathBuf, String> {
  let p = PathBuf::from(workspace_path);
  if !p.is_absolute() {
    return Err("Workspace path must be an absolute path".into());
  }
  Ok(p)
}

#[command]
pub fn fs_create_workspace(workspace_path: String) -> Result<(), String> {
  let root = workspace_root(&workspace_path)?;
  fs::create_dir_all(&root).map_err(|e| e.to_string())?;
  Ok(())
}

#[command]
pub fn fs_update_workspace(workspace_path: String) -> Result<(), String> {
  let root = workspace_root(&workspace_path)?;
  fs::create_dir_all(&root).map_err(|e| e.to_string())?;
  Ok(())
}

#[command]
pub fn fs_remove_workspace(workspace_path: String) -> Result<(), String> {
  let root = workspace_root(&workspace_path)?;
  if root.exists() {
    fs::remove_dir_all(&root).map_err(|e| e.to_string())?;
  }
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
pub fn fs_create_vertex_dir(workspace_path: String, vertex_id: String) -> Result<(), String> {
  let root = workspace_root(&workspace_path)?;
  let dir = root.join(vertex_id);
  if dir.exists() {
    return Err("Vertex directory already exists.".into());
  }
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(())
}

#[command]
pub fn fs_remove_vertex_dir(workspace_path: String, vertex_id: String) -> Result<(), String> {
  let root = workspace_root(&workspace_path)?;
  let dir = root.join(vertex_id);
  if dir.exists() {
    fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
  }
  Ok(())
}
