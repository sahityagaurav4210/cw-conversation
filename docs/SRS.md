# Software Requirement Specification (SRS)
### IEEE Std 830-1998 Standard Specification Structure

**System Name**: Conversation - Encrypted Real-Time Chat & User Management Platform  
**Document Version**: 1.0.0  
**Date**: October 2026  
**Status**: Final / Approved  

---

## Table of Contents
1. [Introduction](#1-introduction)
   - 1.1 [Purpose](#11-purpose)
   - 1.2 [Scope](#12-scope)
   - 1.3 [Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)
   - 1.4 [References](#14-references)
   - 1.5 [Overview](#15-overview)
2. [Overall Description](#2-overall-description)
   - 2.1 [Product Perspective](#21-product-perspective)
   - 2.2 [Product Functions](#22-product-functions)
   - 2.3 [User Characteristics](#23-user-characteristics)
   - 2.4 [Constraints](#24-constraints)
   - 2.5 [Assumptions and Dependencies](#25-assumptions-and-dependencies)
3. [Specific Requirements](#3-specific-requirements)
   - 3.1 [External Interface Requirements](#31-external-interface-requirements)
   - 3.2 [Functional Requirements](#32-functional-requirements)
   - 3.3 [Performance Requirements](#33-performance-requirements)
   - 3.4 [Design Constraints](#34-design-constraints)
   - 3.5 [Software System Attributes](#35-software-system-attributes)
   - 3.6 [Other Requirements](#36-other-requirements)
4. [Supporting Information](#4-supporting-information)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirement Specification (SRS) specifies the functional, non-functional, security, and interface requirements for the **Conversation** real-time messaging and user management system. This document strictly follows the **IEEE Std 830-1998 standard format** and serves as the authoritative technical agreement for system architects, software developers, security reviewers, and quality assurance engineers.

### 1.2 Scope
The **Conversation** platform provides a secure 1-on-1 end-to-end encrypted messaging environment, supporting real-time text exchange, encrypted file attachment transfers, user presence tracking, visual and audio CAPTCHA security validation, user session protection, user feedback management, and administrative governance.

### 1.3 Definitions, Acronyms, and Abbreviations
- **AES-256**: Advanced Encryption Standard using 256-bit symmetric keys.
- **CAPTCHA**: Completely Automated Public Turing test to tell Computers and Humans Apart.
- **E2EE**: End-to-End Encryption.
- **IEEE 830**: IEEE Recommended Practice for Software Requirements Specifications.
- **JWT**: JSON Web Token (RFC 7519).
- **MUI**: Material-UI v5 component library for React.
- **ORM**: Object-Relational Mapping (Sequelize).
- **RBAC**: Role-Based Access Control.
- **Singleton Pattern**: Software design pattern restricting a class to a single active instance.
- **WSS**: WebSockets Secure protocol.

### 1.4 References
1. IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications*.
2. RFC 7519, *JSON Web Token (JWT) Specification*.
3. RFC 5322, *Internet Message Format (Email Validation Standard)*.
4. NIST Special Publication 800-38A, *Recommendation for Block Cipher Modes of Operation*.

### 1.5 Overview
Section 2 provides an overall description of the product perspective, product functions, user characteristics, and general operational constraints. Section 3 presents the detailed specific requirements including external interfaces, functional requirements (FR-1 through FR-8), performance benchmarks, and security attributes adhering to IEEE 830 standards.

---

## 2. Overall Description

### 2.1 Product Perspective
The system follows a multi-tier client-server architecture:
- **Presentation Layer**: React 18 Single Page Application (SPA) built with Vite and Material UI v5.
- **Application & Real-Time Layer**: Node.js and Express HTTP API server coupled with a Socket.IO real-time engine.
- **Data Persistence Layer**: PostgreSQL relational database accessed via Sequelize ORM.
- **CAPTCHA Microservice**: External microservice running at `http://localhost:11905` providing CAPTCHA image/audio generation and validation.

### 2.2 Product Functions
- **Authentication & Authorization**: Registration, unified login, password reset request, CAPTCHA verification (Image & Audio), and account lockouts.
- **Encrypted 1-on-1 Chat**: End-to-end encrypted messaging using AES algorithms per conversation.
- **File Transfers**: Upload, encrypt, store, decrypt, and download attachment files up to 350 MB.
- **Presence & Activity**: Live online/offline user presence tracking, typing notifications, and message read receipts.
- **Admin Governance**: Interactive User Management table (`material-react-table`) allowing account lock/unlock, activation/deactivation, password reset, and deletion.
- **Feedback Subsystem**: User feedback submission and admin review processing workflow.
- **Session Control**: Inactivity timeout modal and automated JWT token refresh interceptor.

### 2.3 User Characteristics
- **Regular User**: Standard end-user with basic web browser experience. Interacts with chat, file sharing, profile management, and feedback submission.
- **System Administrator**: Administrative user possessing high-privilege access. Governs user accounts, security lockouts, and feedback resolution.

### 2.4 Constraints
1. **Singleton WebSocket Constraint**: System must enforce exactly **one single active WebSocket connection per authenticated user account**.
2. **Cryptographic Mandate**: All messages and file captions must be encrypted using AES-256 before database persistence.
3. **Input Sanitization**: User inputs must strictly conform to regex rules (e.g., username: `/^[a-zA-Z0-9_]{1,32}$/`, message: `/^[a-zA-Z0-9 .(),_\-#$/&%@*+'?]+$/`).
4. **Attachment Limit**: Maximum single file attachment upload size constrained to 350 MB.

### 2.5 Assumptions and Dependencies
- PostgreSQL v13+ instance is running and reachable.
- CAPTCHA service is active on the configured URL endpoint.
- Node.js runtime environment v18+ is available for server execution.

---

## 3. Specific Requirements

### 3.1 External Interface Requirements

#### 3.1.1 User Interfaces
- **Login / Signup UI**: Renders username, password, name fields, and an adjacent CAPTCHA box (Image preview + Refresh button + Audio CAPTCHA player + Input field).
- **Chat Interface**: Dual-pane responsive layout featuring a Collapsible Sidebar (with logo height 64px, search bar with query clear adornment, user list with online badges) and Chat Canvas.
- **Admin Dashboard**: `material-react-table` interface with role status chips, account lock toggles, and action context menus.
- **Global Toast Notifications**: Non-intrusive notifications delivered via `react-toastify`.

#### 3.1.2 Hardware Interfaces
No dedicated hardware interfaces required. Standard network interfaces supporting TCP/IP networking.

#### 3.1.3 Software Interfaces
- **Database Connection**: PostgreSQL database connected via Sequelize ORM version 6.37.
- **CAPTCHA Service API**: REST endpoints `/api/v1/captcha/generate`, `/api/v1/captcha/image/:id`, `/api/v1/captcha/audio/:id`, and `/api/v1/captcha/validate`.

#### 3.1.4 Communications Interfaces
- RESTful HTTP/HTTPS API endpoints for stateless data requests.
- Full-duplex WebSockets (WSS / Socket.IO v4) for real-time messaging and status broadcasts.

---

### 3.2 Functional Requirements

| Requirement ID | Feature Area | Description | Priority |
| :--- | :--- | :--- | :--- |
| **FR-1.1** | User Registration | System shall allow user registration with unique username, password, and name. Optional profile fields (email, photo, sex) shall NOT be presented during registration. | High |
| **FR-1.2** | CAPTCHA Check | System shall require and validate CAPTCHA code prior to login or registration. | High |
| **FR-1.3** | Audio CAPTCHA | System shall stream audio CAPTCHA when requested by clicking the audio icon. | Medium |
| **FR-1.4** | Account Lockout | System shall lock an account after 5 consecutive failed login attempts. | High |
| **FR-2.1** | Profile Management | System shall require CAPTCHA code when updating profile details. | High |
| **FR-2.2** | Profile Photo Upload | System shall support profile photo uploads (*.jpg, *.jpeg, *.png) up to 2MB, enforcing client & server magic bytes inspection (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG). | High |
| **FR-2.3** | Email Domain Restriction | System shall support optional email address entry via split text input (username) and MUI Autocomplete dropdown populated exclusively from active Email Client Master domains. | High |
| **FR-2.4** | Sex Selection | System shall support optional sex selection (`male`, `female`, `tgp` - Transgender Person). | Medium |
| **FR-3.1** | Private Messaging | System shall establish 1-on-1 encrypted messaging between any two users. | High |
| **FR-3.2** | AES Encryption | System shall encrypt message text using AES before database storage. | High |
| **FR-3.3** | Singleton Socket | Server shall disconnect existing user socket when a new connection is established for that user. | High |
| **FR-3.4** | URL Sharing | System shall provide a plug-and-play modal (`UrlShareModal.jsx`) triggered via a button adjacent to the code snippet button in `ChatInput.jsx`, allowing users to enter a web URL and optional description, transmitting it as a clickable URL link. | Medium |
| **FR-4.1** | Attachment Transfer | System shall encrypt, upload, store, and allow downloading of attachments up to 350MB. | High |
| **FR-5.1** | Read Status | System shall mark messages as read when recipient focuses active conversation. | Medium |
| **FR-6.1** | Admin Governance | Admin shall view, lock, unlock, activate, reset password, or delete user accounts. | High |
| **FR-6.2** | Email Client Master | System Masters tab shall display Email Client Master with header controls (Title, Refresh button, Add Email Client button) placed as a separate entity above `material-react-table`, keeping default MRT toolbar functionality. | High |
| **FR-6.3** | Coding Languages Master | System Masters tab shall display Supported Coding Languages Master (`material-react-table` + separate header + `AddCodingLanguageDialog`). `CodeSnippetModal.jsx` shall dynamically fetch active languages and render an MUI `Autocomplete` selector. | High |
| **FR-7.1** | Feedback Subsystem | User shall submit feedback with section category (`accounts`, `login`, `chats`) and RFC email. | Medium |
| **FR-8.1** | Docker Orchestration | System shall provide a `docker-compose.yml` file orchestration featuring frontend, backend, and PostgreSQL database services, with separate persistent volumes (`postgres_data`, `backend_uploads`, `backend_logs`). | High |
| **FR-8.2** | Winston Logger | Backend shall implement Winston structured logging storing JSON and formatted logs under `backend/logs` (`combined.log`, `error.log`). | High |

---

### 3.3 Performance Requirements
- **API Response Latency**: 95% of REST API calls completed within 200 ms.
- **WebSocket Transmission Latency**: Real-time message broadcast latency below 50 ms.
- **Throughput**: Support at least 1,000 active concurrent WebSocket sessions per application instance.

### 3.4 Design Constraints
- All user passwords must be hashed using `bcryptjs` with salt factor 10.
- Client and server must enforce the Singleton Socket Design Pattern.

### 3.5 Software System Attributes
- **Reliability**: Automatic Socket.IO client reconnection (up to 5 attempts) and clean socket disconnection on browser reload.
- **Availability**: 99.9% application uptime target.
- **Security**: JWT stateless authentication, role middleware verification, AES cipher encryption, CAPTCHA protection.
- **Maintainability**: Decoupled React component tree and clean Express route controllers.
- **Portability**: Operating system independent (Linux, Windows, macOS).

---

## 4. Supporting Information
- **IEEE Std 830 Compliance Matrix**: Fully compliant with IEEE Std 830-1998 structure.
- **Document History**: Version 1.0.0 published October 2026.
