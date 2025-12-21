fn main() {
    // Check if exiftool is available in the system
    let exiftool_check = std::process::Command::new("exiftool")
        .arg("-ver")
        .output();

    match exiftool_check {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout);
            println!("cargo:warning=ExifTool found in system PATH (version {})", version.trim());
        }
        _ => {
            println!("cargo:warning=ExifTool NOT found in system PATH!");
            println!("cargo:warning=The application will look for a bundled exiftool binary.");
            println!("cargo:warning=To bundle exiftool:");
            println!("cargo:warning=  1. Download ExifTool from https://exiftool.org/");
            println!("cargo:warning=  2. Place the exiftool binary in src-tauri/resources/");
            println!("cargo:warning=  3. Make it executable: chmod +x src-tauri/resources/exiftool");
        }
    }

    tauri_build::build()
}
