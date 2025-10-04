# 1. Introduction

This document outlines the complete fullstack architecture for **CF Office Hours Platform**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for a modern fullstack application where these concerns are increasingly intertwined.

The platform replaces Union.vc to provide intelligent mentor-mentee matching, seamless calendar integration, reputation-based access control, and automated meeting scheduling for Capital Factory's startup accelerator program.

## 1.1 Starter Template or Existing Project

**Decision:** N/A - Greenfield project with predefined stack

No starter template is required since the architecture is already well-defined. The project will use:
- Vite for React frontend scaffolding
- Hono framework for API development
- Cloudflare Workers for serverless deployment

This is a **greenfield project** with a clearly defined tech stack:

- **Frontend:** React + Vite hosted on Cloudflare Pages
- **Backend:** Cloudflare Workers with Hono framework
- **Database:** Supabase (Postgres + Auth + Storage + Realtime)
- **UI:** Shadcn/ui + Tailwind CSS

## 1.2 Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-02 | 1.0 | Initial architecture document | Winston (Architect Agent) |
| 2025-10-03 | 1.1 | Updated Section 4 Data Models for PRD v2.1 alignment | Winston (Architect Agent) |
| 2025-10-03 | 2.3 | Updated for PRD v2.3 alignment, added Section 4.10 (External Integrations) and Section 8.7 (Background Jobs), added PRD requirement cross-references | Winston (Architect Agent) |
| 2025-10-03 | 2.4 | Clarified Google Meet link generation priority (mentee > mentor), added explicit coordinator role check in responsiveness calculation, extended AvatarCropSettings with crop coordinates | Sarah (PO Agent) |

---
