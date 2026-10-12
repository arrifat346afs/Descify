use std::process::Command;
use std::sync::OnceLock;

pub fn is_gpu_available() -> bool {
    static AVAILABLE: OnceLock<bool> = OnceLock::new();
    *AVAILABLE.get_or_init(|| check_nvidia() || check_amd())
}

fn check_nvidia() -> bool {
    if let Ok(output) = Command::new("nvidia-smi")
        .arg("--query-gpu=name")
        .arg("--format=csv,noheader")
        .output()
    {
        return output.status.success() && !output.stdout.is_empty();
    }
    false
}

fn check_amd() -> bool {
    if cfg!(target_os = "linux") {
        if let Ok(output) = Command::new("lsmod").output() {
            return output.status.success()
                && String::from_utf8_lossy(&output.stdout).contains("radeon");
        }
    }
    false
}

pub fn get_ffmpeg_hwaccel_args() -> Vec<&'static str> {
    static ARGS: OnceLock<Vec<&'static str>> = OnceLock::new();
    ARGS.get_or_init(|| {
        let mut args = Vec::new();

        if check_nvidia() {
            args.push("-hwaccel");
            args.push("cuda");
        } else if cfg!(target_os = "macos") {
            args.push("-hwaccel");
            args.push("auto");
        } else if cfg!(target_os = "linux") && check_amd() {
            args.push("-hwaccel");
            args.push("vaapi");
        }

        args
    })
    .clone()
}
