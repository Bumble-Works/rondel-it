class Task < ApplicationRecord
  enum :status, { todo: 0, doing: 1, done: 2 }

  has_many :task_events, dependent: :destroy
  has_one :task_note, dependent: :destroy
  has_many :rondel_events, dependent: :destroy

  belongs_to :origin_task, class_name: "Task", optional: true
  belongs_to :previous_task, class_name: "Task", optional: true

  has_and_belongs_to_many :categories

  validates :title, presence: true
  validates :day_date, presence: true

  scope :for_day, ->(date) { where(day_date: date) }
  scope :ordered_for_day, lambda {
    order(Arel.sql("CASE WHEN status = 2 THEN 1 ELSE 0 END ASC"), :position, :created_at)
  }
end
