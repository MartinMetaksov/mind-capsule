use std::fs;
use std::path::PathBuf;
use std::process::Command;
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

#[command]
pub fn fs_open_path(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.is_absolute() {
        return Err("Path must be an absolute path".into());
    }
    if !target.exists() {
        return Err("Path does not exist.".into());
    }
    let is_dir = fs::metadata(&target)
        .map_err(|e| e.to_string())?
        .is_dir();
    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("open");
        if is_dir && path.ends_with(".app") {
            cmd.args(["-R", &path]);
        } else {
            cmd.arg(&path);
        }
        let status = cmd
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("Failed to open path (status: {status})."));
        }
    }
    #[cfg(target_os = "windows")]
    {
        let status = Command::new("cmd")
            .args(["/C", "start", "", &path])
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("Failed to open path (status: {status})."));
        }
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let status = Command::new("xdg-open")
            .arg(&path)
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("Failed to open path (status: {status})."));
        }
    }
    Ok(())
}

#[command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("Only http/https URLs are supported.".into());
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .status()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &url])
            .status()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(&url)
            .status()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn temp_workspace_path() -> PathBuf {
        let root = std::env::temp_dir();
        root.join(format!("mind-capsule-test-{}", Uuid::new_v4()))
    }

    #[test]
    fn workspace_create_update_remove_roundtrip() {
        let workspace_path = temp_workspace_path();
        let workspace_path_str = workspace_path.to_string_lossy().to_string();

        fs_create_workspace(workspace_path_str.clone()).expect("create workspace");
        assert!(workspace_path.exists());

        fs_update_workspace(workspace_path_str.clone()).expect("update workspace");
        assert!(workspace_path.exists());

        fs_remove_workspace(workspace_path_str.clone()).expect("remove workspace");
        assert!(!workspace_path.exists());
    }

    #[test]
    fn vertex_dir_create_and_remove() {
        let workspace_path = temp_workspace_path();
        let workspace_path_str = workspace_path.to_string_lossy().to_string();
        fs_create_workspace(workspace_path_str.clone()).expect("create workspace");

        let vertex_id = "vertex-test".to_string();
        fs_create_vertex_dir(workspace_path_str.clone(), vertex_id.clone())
            .expect("create vertex dir");
        assert!(workspace_path.join(&vertex_id).exists());

        fs_remove_vertex_dir(workspace_path_str.clone(), vertex_id.clone())
            .expect("remove vertex dir");
        assert!(!workspace_path.join(&vertex_id).exists());

        fs_remove_workspace(workspace_path_str).expect("cleanup workspace");
    }

    #[test]
    fn vertex_create_fails_when_dir_exists() {
        let workspace_path = temp_workspace_path();
        let workspace_path_str = workspace_path.to_string_lossy().to_string();
        fs_create_workspace(workspace_path_str.clone()).expect("create workspace");

        let vertex_id = "vertex-test".to_string();
        fs_create_vertex_dir(workspace_path_str.clone(), vertex_id.clone())
            .expect("create vertex dir");

        let duplicate = fs_create_vertex_dir(workspace_path_str.clone(), vertex_id.clone());
        assert!(duplicate.is_err());

        fs_remove_workspace(workspace_path_str).expect("cleanup workspace");
    }

    #[test]
    fn fs_open_path_validates_input() {
        assert!(fs_open_path("relative/path".into()).is_err());
        let missing = temp_workspace_path();
        assert!(fs_open_path(missing.to_string_lossy().to_string()).is_err());
    }

    #[test]
    fn open_external_url_rejects_non_http() {
        assert!(open_external_url("file:///tmp/test.txt".into()).is_err());
        assert!(open_external_url("mailto:test@example.com".into()).is_err());
    }
}
