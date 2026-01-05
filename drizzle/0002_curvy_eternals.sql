CREATE TYPE "public"."consent_action" AS ENUM('accepted', 'rejected', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms_and_privacy', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."legal_document_type" AS ENUM('terms_and_conditions', 'privacy_policy');--> statement-breakpoint
CREATE TABLE "consent_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"consent_type" "consent_type" NOT NULL,
	"action" "consent_action" NOT NULL,
	"document_version" text,
	"ip_address" text,
	"user_agent" text,
	"fingerprint" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "legal_document_type" NOT NULL,
	"version" text NOT NULL,
	"content" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"terms_privacy_accepted" boolean DEFAULT false NOT NULL,
	"terms_privacy_version" text,
	"terms_privacy_accepted_at" timestamp,
	"marketing_accepted" boolean DEFAULT false NOT NULL,
	"marketing_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_consents_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "consent_audit" ADD CONSTRAINT "consent_audit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_audit_userId_idx" ON "consent_audit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consent_audit_consentType_idx" ON "consent_audit" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "consent_audit_createdAt_idx" ON "consent_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "legal_documents_type_idx" ON "legal_documents" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_type_version_uidx" ON "legal_documents" USING btree ("type","version");--> statement-breakpoint
CREATE UNIQUE INDEX "user_consents_userId_uidx" ON "user_consents" USING btree ("user_id");