class RondelEvent < ApplicationRecord
  belongs_to :task
  belongs_to :resulting_task, class_name: "Task", optional: true

  validates :from_date, :to_date, :from_status, presence: true
end
