# Change Log

All notable changes to the "llm-share" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Changed
- **BREAKING:** Extension renamed from "LLM Governance Viewer" to "LLM Share"
  - Package name changed from `llm-governance-viewer` to `llm-share`
  - Config file renamed from `llm_approvements.json` to `llm_share.json`
  - Users must rename their config file to use this version
- Updated branding and documentation to reflect new name

### Added
- Initial release with file decoration support
- Configuration file parsing with validation
- Real-time file watching
- Priority-based rule resolution
- Error and warning notifications