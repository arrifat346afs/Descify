use std::process::Command;

pub fn is_gpu_available() -> bool {
    check_nvidia() || check_amd()
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
}

#[allow(dead_code)]
pub fn get_preferred_hardware_encoder() -> &'static str {
    if check_nvidia() {
        return "h264_nvenc";
    }
    if cfg!(target_os = "macos") {
        return "h264_videotoolbox";
    }
    if cfg!(target_os = "linux") && check_amd() {
        return "h264_vaapi";
    }
    "libx264"
}

#[allow(dead_code)]
pub fn get_video_encoder_args() -> Vec<&'static str> {
    let encoder = get_preferred_hardware_encoder();
    let mut args = Vec::new();

    args.push("-c:v");

    match encoder {
        "h264_videotoolbox" => {
            args.push("h264_videotoolbox");
        }
        "h264_nvenc" => {
            args.push("h264_nvenc");
            args.push("-preset");
            args.push("fast");
        }
        "h264_vaapi" => {
            args.push("h264_vaapi");
        }
        _ => {
            args.push("libx264");
            args.push("-preset");
            args.push("fast");
        }
    }

    args
}
