class TaskEvent < ApplicationRecord
  enum :event_type, {
    created: 0,
    status_changed: 1,
    note_updated: 2,
    rondelled: 3,
    category_changed: 4
  }

  belongs_to :task

  validates :occurred_on, presence: true
end
