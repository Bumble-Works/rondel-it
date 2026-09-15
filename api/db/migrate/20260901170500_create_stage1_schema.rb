class CreateStage1Schema < ActiveRecord::Migration[8.0]
  def change
    enable_extension "pgcrypto"

    create_table :tasks, id: :uuid do |t|
      t.string :title, null: false
      t.integer :status, null: false, default: 0
      t.date :day_date, null: false
      t.integer :position, null: false, default: 0
      t.integer :rondel_count, null: false, default: 0
      t.uuid :origin_task_id
      t.uuid :previous_task_id
      t.datetime :completed_at

      t.timestamps
    end

    add_index :tasks, :day_date
    add_index :tasks, :status
    add_foreign_key :tasks, :tasks, column: :origin_task_id
    add_foreign_key :tasks, :tasks, column: :previous_task_id

    create_table :task_notes, id: :uuid do |t|
      t.references :task, null: false, type: :uuid, foreign_key: true, index: { unique: true }
      t.text :body, null: false, default: ""

      t.timestamps
    end

    create_table :task_events, id: :uuid do |t|
      t.references :task, null: false, type: :uuid, foreign_key: true
      t.integer :event_type, null: false
      t.string :from_value
      t.string :to_value
      t.date :occurred_on, null: false

      t.timestamps
    end

    add_index :task_events, [:task_id, :created_at]

    create_table :rondel_events, id: :uuid do |t|
      t.references :task, null: false, type: :uuid, foreign_key: true
      t.uuid :resulting_task_id
      t.date :from_date, null: false
      t.date :to_date, null: false
      t.string :from_status, null: false
      t.string :reason

      t.timestamps
    end

    add_foreign_key :rondel_events, :tasks, column: :resulting_task_id

    create_table :categories, id: :uuid do |t|
      t.string :name, null: false
      t.string :color

      t.timestamps
    end

    add_index :categories, :name, unique: true

    create_table :categories_tasks, id: false do |t|
      t.references :task, null: false, type: :uuid, foreign_key: true
      t.references :category, null: false, type: :uuid, foreign_key: true
    end

    add_index :categories_tasks, [:task_id, :category_id], unique: true

    create_table :user_settings, id: :uuid do |t|
      t.time :end_of_day_time, null: false, default: "17:00"
      t.string :timezone, null: false, default: "UTC"

      t.timestamps
    end
  end
end
