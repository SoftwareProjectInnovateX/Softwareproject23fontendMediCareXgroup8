import { useState } from "react";

export default function UploadModal({ show, onClose }) {
  const [file, setFile] = useState(null);

  if (!show) return null;

  const handleUpload = () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    // temporary demo action
    console.log("Uploading file:", file);

    alert("File uploaded (demo)");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "500px",
          background: "white",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "15px",
          }}
        >
          <h2>Upload Prescription</h2>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* File input */}
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        {/* Upload button */}
        <button
          onClick={handleUpload}
          style={{
            marginTop: "15px",
            width: "100%",
            padding: "10px",
            backgroundColor: "#1e3a8a",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Upload
        </button>
      </div>
    </div>
  );
}