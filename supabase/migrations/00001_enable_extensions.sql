-- ============================================================
-- Migration 00001: Enable required PostgreSQL extensions
-- Run this first before any other migrations
-- ============================================================

-- Vector similarity search (pgvector)
create extension if not exists vector;

-- UUID generation
create extension if not exists "uuid-ossp";

-- Cryptographic functions (used for webhook secret hashing)
create extension if not exists pgcrypto;

-- Trigram text search (for fuzzy source name search)
create extension if not exists pg_trgm;
