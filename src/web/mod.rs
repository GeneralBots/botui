//! Web module with basic data structures
//!
//! Contains DTOs and types for the web API layer.

use serde::{Deserialize, Serialize};

/// Request/Response DTOs for web API
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub sender: String,
    pub content: String,
    pub timestamp: String,
    pub is_user: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ScanRequest {
    pub bot_id: Option<String>,
    pub include_info: bool,
}

#[derive(Debug, Serialize)]
pub struct IssueResponse {
    pub id: String,
    pub severity: String,
    pub issue_type: String,
    pub title: String,
    pub description: String,
    pub file_path: String,
    pub line_number: Option<usize>,
    pub code_snippet: Option<String>,
    pub remediation: String,
    pub category: String,
}

#[derive(Debug, Serialize)]
pub struct ScanSummary {
    pub total_issues: usize,
    pub critical_count: usize,
    pub high_count: usize,
    pub total_files_scanned: usize,
    pub compliance_score: f64,
}

#[derive(Debug, Serialize)]
pub struct ScanResponse {
    pub scan_id: String,
    pub issues: Vec<IssueResponse>,
    pub summary: ScanSummary,
}
