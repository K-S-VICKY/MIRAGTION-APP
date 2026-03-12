import React, { useState, useRef } from "react";
import mammoth from "mammoth";
import axios from "axios";
import "./DocUpload.css";

const API_KEY = process.env.REACT_APP_API_KEY;
const USER_ID = process.env.REACT_APP_USER_ID;
const API_URL = process.env.REACT_APP_API_URL;
const API_TOKEN_HEADER = process.env.REACT_APP_DOC360_API_TOKEN_HEADER || "api_token";
const API_TOKEN_PREFIX = process.env.REACT_APP_DOC360_API_TOKEN_PREFIX || "";
const CATEGORY_ID = process.env.REACT_APP_CATEGORY_ID;
const PROJECT_VERSION_ID = process.env.REACT_APP_PROJECT_VERSION_ID;
const LANGUAGE_CODE = process.env.REACT_APP_LANGUAGE_CODE;

function DocUpload() {
  const [htmlContent, setHtmlContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  const getBaseName = (name) => name?.replace(/\.docx?$/i, "") || "Migrated Article";

  const isDocFile = (name) => /\.docx?$/i.test(name || "");

  const processFile = async (file) => {
    if (!file) return;

    if (!isDocFile(file.name)) {
      setErrorMessage("Please upload a Word file with .doc or .docx extension.");
      return;
    }

    if (/\.doc$/i.test(file.name)) {
      setErrorMessage(".doc files are not supported by browser conversion. Please convert to .docx and upload again.");
      return;
    }

    setFileName(file.name);
    setSaveStatus("");
    setErrorMessage("");
    setApiMessage("");

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;

        if (!html?.trim()) {
          setErrorMessage("No HTML content was generated from this file.");
          return;
        }

        setHtmlContent(html);
        setActiveTab("preview");
      } catch (error) {
        console.error("Conversion failed:", error);
        setErrorMessage("Failed to convert the document to HTML. Please try another .docx file.");
      }
    };

    reader.onerror = () => {
      setErrorMessage("Unable to read the selected file.");
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFile = (event) => {
    const file = event.target.files[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const buildPayload = (contentHtml) => {
    return {
      title: getBaseName(fileName),
      content: contentHtml,
      user_id: USER_ID,
      category_id: CATEGORY_ID,
      project_version_id: PROJECT_VERSION_ID,
      content_type: 1,
      ...(LANGUAGE_CODE ? { language_code: LANGUAGE_CODE } : {})
    };
  };

  const validateApiConfig = () => {
    const missing = [];
    if (!API_URL) missing.push("REACT_APP_API_URL");
    if (!API_KEY) missing.push("REACT_APP_API_KEY");
    if (!USER_ID) missing.push("REACT_APP_USER_ID");
    if (!CATEGORY_ID) missing.push("REACT_APP_CATEGORY_ID");
    if (!PROJECT_VERSION_ID) missing.push("REACT_APP_PROJECT_VERSION_ID");
    if (missing.length > 0) {
      setErrorMessage(`Missing required .env config: ${missing.join(", ")}`);
      return false;
    }
    return true;
  };

  const uploadToDoc360 = async (contentHtml, successMsg) => {
    if (!validateApiConfig()) return;

    setSaveStatus("saving");
    setErrorMessage("");
    setApiMessage("");

    const payload = buildPayload(contentHtml);
    const tokenValue = API_TOKEN_PREFIX ? `${API_TOKEN_PREFIX} ${API_KEY}` : API_KEY;

    try {
      const response = await axios.post(
        API_URL,
        payload,
        {
          headers: {
            [API_TOKEN_HEADER]: tokenValue,
            "Content-Type": "application/json"
          }
        }
      );

      setSaveStatus("success");

      const articleId =
        response?.data?.data?.id ||
        response?.data?.data?.article_id ||
        response?.data?.id;

      if (articleId) {
        setApiMessage(`${successMsg} Article ID: ${articleId}`);
      } else {
        setApiMessage(successMsg);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setSaveStatus("error");

      const apiErrorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Upload failed. Please check API credentials and payload fields.";

      setErrorMessage(apiErrorMessage);
    }

    setTimeout(() => setSaveStatus(""), 3000);
  };

  const handleSave = async () => {
    const editedHtml = editorRef.current?.innerHTML || "";

    if (!editedHtml.trim()) {
      setErrorMessage("There is no HTML content to upload.");
      return;
    }

    setHtmlContent(editedHtml);
    await uploadToDoc360(editedHtml, "Uploaded to Document360 successfully.");
  };

  const handleDownloadHtml = () => {
    const editedHtml = editorRef.current?.innerHTML || htmlContent;
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName || "Migrated Document"}</title>
</head>
<body>
${editedHtml}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getBaseName(fileName) || "document"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatHtml = (html, forDisplay = false) => {
    let processed = html;

    // For source code display, truncate long base64 data URIs
    if (forDisplay) {
      processed = processed.replace(
        /src="data:([^;]+);base64,([^"]{100})[^"]*"/g,
        'src="data:$1;base64,$2.../* base64 data truncated */"'
      );
    }

    let formatted = "";
    let indent = 0;
    const tab = "  ";

    // Add line breaks after closing tags and before opening tags
    const rawTags = processed.replace(/>\s*</g, ">\n<");
    const lines = rawTags.split("\n");

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Decrease indent for closing tags
      if (trimmed.startsWith("</")) {
        indent = Math.max(0, indent - 1);
      }

      formatted += tab.repeat(indent) + trimmed + "\n";

      // Increase indent for opening tags (not self-closing or void)
      if (
        trimmed.startsWith("<") &&
        !trimmed.startsWith("</") &&
        !trimmed.endsWith("/>") &&
        !trimmed.match(/^<(img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)\b/i) &&
        !trimmed.includes("</")
      ) {
        indent++;
      }
    });

    return formatted.trim();
  };

  const buildFullHtml = (bodyContent) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName || "Migrated Document"}</title>
</head>
<body>
${bodyContent}
</body>
</html>`;
  };

  const getSourceCodeForDisplay = () => {
    const editedHtml = editorRef.current?.innerHTML || htmlContent;
    const formattedBody = formatHtml(editedHtml, true);
    return buildFullHtml(formattedBody.split("\n").map(l => "  " + l).join("\n"));
  };

  const getSourceCodeFull = () => {
    const editedHtml = editorRef.current?.innerHTML || htmlContent;
    const formattedBody = formatHtml(editedHtml, false);
    return buildFullHtml(formattedBody.split("\n").map(l => "  " + l).join("\n"));
  };

  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(getSourceCodeFull());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleUploadSourceCode = async () => {
    const fullHtml = getSourceCodeFull();

    if (!fullHtml.trim()) {
      setErrorMessage("There is no HTML source code to upload.");
      return;
    }

    await uploadToDoc360(fullHtml, "Source code uploaded to Document360 successfully.");
  };

  return (
    <div className={`doc-upload-wrapper ${darkMode ? "dark" : "light"}`}>
      <div className="top-bar">
        <h1 className="app-title">Migration App</h1>
        <button
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? "☀️" : "🌙"}
          <span>{darkMode ? "Light" : "Dark"}</span>
        </button>
      </div>

      <div className="doc-upload-container">
        <h2 className="doc-upload-title">Upload Word File</h2>

        <div
          className={`dropzone ${isDragging ? "dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            type="file"
            accept=".doc,.docx"
            onChange={handleFile}
            ref={fileInputRef}
            style={{ display: "none" }}
          />
          <div className="dropzone-icon">📄</div>
          <p className="dropzone-text">
            {fileName
              ? fileName
              : "Drag & drop your .docx file here, or click to browse"}
          </p>
          <span className="dropzone-hint">Upload .docx directly. For .doc, convert to .docx first.</span>
        </div>

        {errorMessage && <p className="status-message error">{errorMessage}</p>}
        {apiMessage && <p className="status-message success">{apiMessage}</p>}

        {htmlContent && (
          <div className="preview-section">
            <div className="preview-header">
              <div className="tab-bar">
                <button
                  className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
                  onClick={() => setActiveTab("preview")}
                >
                  📝 Preview
                </button>
                <button
                  className={`tab-btn ${activeTab === "source" ? "active" : ""}`}
                  onClick={() => setActiveTab("source")}
                >
                  {"</>"} Source Code
                </button>
              </div>
              <div className="preview-actions">
                {activeTab === "source" && (
                  <>
                    <button className="btn btn-copy" onClick={handleCopySource}>
                      {copied ? "✅ Copied!" : "📋 Copy"}
                    </button>
                    <button
                      className={`btn btn-save ${saveStatus}`}
                      onClick={handleUploadSourceCode}
                      disabled={saveStatus === "saving"}
                    >
                      {saveStatus === "saving"
                        ? "⏳ Uploading..."
                        : saveStatus === "success"
                        ? "✅ Uploaded!"
                        : saveStatus === "error"
                        ? "❌ Failed"
                        : "🚀 Upload to Doc360"}
                    </button>
                  </>
                )}
                <button className="btn btn-download" onClick={handleDownloadHtml}>
                  ⬇ Download
                </button>
                {activeTab === "preview" && (
                  <button
                    className={`btn btn-save ${saveStatus}`}
                    onClick={handleSave}
                    disabled={saveStatus === "saving"}
                  >
                    {saveStatus === "saving"
                      ? "⏳ Saving..."
                      : saveStatus === "success"
                      ? "✅ Saved!"
                      : saveStatus === "error"
                      ? "❌ Failed"
                      : "💾 Save"}
                  </button>
                )}
              </div>
            </div>

            {activeTab === "preview" && (
              <>
                <p className="edit-hint">Click below to edit the content directly</p>
                <div
                  ref={editorRef}
                  className="preview-content editable"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </>
            )}

            {activeTab === "source" && (
              <pre className="source-code">
                <code>{getSourceCodeForDisplay()}</code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocUpload;