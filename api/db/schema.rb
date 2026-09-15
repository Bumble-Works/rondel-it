# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_09_01_170500) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "categories", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "color"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_categories_on_name", unique: true
  end

  create_table "categories_tasks", id: false, force: :cascade do |t|
    t.uuid "task_id", null: false
    t.uuid "category_id", null: false
    t.index ["category_id"], name: "index_categories_tasks_on_category_id"
    t.index ["task_id", "category_id"], name: "index_categories_tasks_on_task_id_and_category_id", unique: true
    t.index ["task_id"], name: "index_categories_tasks_on_task_id"
  end

  create_table "rondel_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "task_id", null: false
    t.uuid "resulting_task_id"
    t.date "from_date", null: false
    t.date "to_date", null: false
    t.string "from_status", null: false
    t.string "reason"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["task_id"], name: "index_rondel_events_on_task_id"
  end

  create_table "task_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "task_id", null: false
    t.integer "event_type", null: false
    t.string "from_value"
    t.string "to_value"
    t.date "occurred_on", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["task_id", "created_at"], name: "index_task_events_on_task_id_and_created_at"
    t.index ["task_id"], name: "index_task_events_on_task_id"
  end

  create_table "task_notes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "task_id", null: false
    t.text "body", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["task_id"], name: "index_task_notes_on_task_id", unique: true
  end

  create_table "tasks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "title", null: false
    t.integer "status", default: 0, null: false
    t.date "day_date", null: false
    t.integer "position", default: 0, null: false
    t.integer "rondel_count", default: 0, null: false
    t.uuid "origin_task_id"
    t.uuid "previous_task_id"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["day_date"], name: "index_tasks_on_day_date"
    t.index ["status"], name: "index_tasks_on_status"
  end

  create_table "user_settings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.time "end_of_day_time", default: "2000-01-01 17:00:00", null: false
    t.string "timezone", default: "UTC", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "categories_tasks", "categories"
  add_foreign_key "categories_tasks", "tasks"
  add_foreign_key "rondel_events", "tasks"
  add_foreign_key "rondel_events", "tasks", column: "resulting_task_id"
  add_foreign_key "task_events", "tasks"
  add_foreign_key "task_notes", "tasks"
  add_foreign_key "tasks", "tasks", column: "origin_task_id"
  add_foreign_key "tasks", "tasks", column: "previous_task_id"
end
