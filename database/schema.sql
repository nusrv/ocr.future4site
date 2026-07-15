CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  plan_code VARCHAR(40) NOT NULL DEFAULT 'pilot',
  monthly_page_limit INT NOT NULL DEFAULT 500,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  locale ENUM('en','ar') NOT NULL DEFAULT 'en',
  system_role ENUM('user','admin') NOT NULL DEFAULT 'user',
  disabled_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memberships (
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (organization_id, user_id),
  CONSTRAINT fk_membership_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_keys (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  key_hash CHAR(64) NOT NULL UNIQUE,
  last_used_at DATETIME(3) NULL,
  expires_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_api_key_org (organization_id),
  CONSTRAINT fk_api_key_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_key_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ocr_jobs (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  created_by CHAR(36) NULL,
  status ENUM('queued','processing','succeeded','failed','cancelled','expired') NOT NULL DEFAULT 'queued',
  original_name VARCHAR(255) NOT NULL,
  media_type VARCHAR(80) NOT NULL,
  source_path VARCHAR(500) NOT NULL,
  source_sha256 CHAR(64) NOT NULL,
  source_bytes BIGINT UNSIGNED NOT NULL,
  language ENUM('eng','ara','eng+ara') NOT NULL,
  page_count INT NULL,
  result_text LONGTEXT NULL,
  confidence DECIMAL(5,2) NULL,
  error_code VARCHAR(80) NULL,
  error_message VARCHAR(500) NULL,
  worker_id VARCHAR(120) NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  locked_at DATETIME(3) NULL,
  started_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_jobs_org_created (organization_id, created_at),
  INDEX idx_jobs_queue (status, created_at),
  CONSTRAINT fk_job_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ocr_pages (
  id CHAR(36) PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  page_number INT NOT NULL,
  text LONGTEXT NOT NULL,
  confidence DECIMAL(5,2) NULL,
  width INT NULL,
  height INT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_job_page (job_id, page_number),
  CONSTRAINT fk_page_job FOREIGN KEY (job_id) REFERENCES ocr_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usage_events (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  job_id CHAR(36) NOT NULL,
  event_type ENUM('ocr_pages') NOT NULL,
  quantity INT NOT NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_job_usage (job_id, event_type),
  INDEX idx_usage_org_time (organization_id, occurred_at),
  CONSTRAINT fk_usage_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_usage_job FOREIGN KEY (job_id) REFERENCES ocr_jobs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NULL,
  actor_user_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(60) NOT NULL,
  target_id VARCHAR(100) NULL,
  ip_address VARCHAR(64) NULL,
  metadata_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_audit_org_time (organization_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
