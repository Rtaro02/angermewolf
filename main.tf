locals {
  project_id = "angermewolf"
}

provider "google" {
  project = local.project_id
  region  = "us-west1"
}

terraform {
  backend "gcs" {
    bucket = "angermewolf_tfstate"
    prefix = "terraform/"
  }
}

resource "google_project" "this" {
  name       = "angermewolf"
  project_id = "angermewolf"
  billing_account = "01FED5-3CFFA8-E45C19"
}

resource "google_pubsub_topic" "this" {
  project = local.project_id
  name    = "angermewolf"
}

resource "google_cloud_scheduler_job" "this" {
  name      = "angermewolf"
  schedule  = "*/5 * * * *"
  time_zone = "Asia/Tokyo"
  region    = "asia-northeast1"

  pubsub_target {
    # topic.id is the topic's full resource name.
    topic_name = google_pubsub_topic.this.id
    data       = base64encode("run")
  }
}

resource "google_storage_bucket" "this" {
  name          = "angermewolf"
  location      = "US-WEST1"
  storage_class = "STANDARD"
}

resource "google_storage_bucket_object" "this" {
  name   = "angermewolf"
  source = "./angermewolf.zip"
  bucket = google_storage_bucket.this.name
}

resource "google_cloudfunctions_function" "this" {
  name    = "angermewolf"
  runtime = "nodejs12"
  project = local.project_id
  region  = "asia-northeast1"

  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.this.name
  source_archive_object = google_storage_bucket_object.this.name
  entry_point           = "execute"
  event_trigger {
    event_type = "google.pubsub.topic.publish"
    resource   = "projects/angermewolf/topics/angermewolf"
    failure_policy {
      retry = false
    }
  }
  service_account_email = "${google_project.this.number}-compute@developer.gserviceaccount.com"
}