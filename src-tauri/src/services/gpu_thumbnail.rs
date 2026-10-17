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

pub fn is_gpu_faster() -> bool {
    static GPU_FASTER: OnceLock<bool> = OnceLock::new();
    *GPU_FASTER.get_or_init(|| {
        if !is_gpu_available() {
            return false;
        }
        benchmark_gpu()
    })
}

fn benchmark_gpu() -> bool {
    let ffmpeg = match which::which("ffmpeg") {
        Ok(p) => p,
        Err(_) => return false,
    };
    let hw_args = get_ffmpeg_hwaccel_args();
    if hw_args.is_empty() {
        return false;
    }

    let start_gpu = std::time::Instant::now();
    let mut gpu_cmd = Command::new(&ffmpeg);
    gpu_cmd.args(&hw_args);
    gpu_cmd.args(["-f", "lavfi", "-i", "testsrc=duration=1:size=640x360:rate=1", "-frames:v", "1", "-f", "null", "-"]);
    let Ok(gpu_out) = gpu_cmd.output() else {
        return false;
    };
    if !gpu_out.status.success() {
        return false;
    }
    let gpu_elapsed = start_gpu.elapsed();

    let start_cpu = std::time::Instant::now();
    let Ok(cpu_out) = Command::new(&ffmpeg)
        .args(["-f", "lavfi", "-i", "testsrc=duration=1:size=640x360:rate=1", "-frames:v", "1", "-f", "null", "-"])
        .output() else {
        return false;
    };
    if !cpu_out.status.success() {
        return false;
    }
    let cpu_elapsed = start_cpu.elapsed();

    // Only use GPU if it is strictly faster than CPU (and worked)
    gpu_elapsed < cpu_elapsed
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

