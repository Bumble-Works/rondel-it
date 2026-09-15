class TaskNote < ApplicationRecord
  belongs_to :task

  validates :body, length: { maximum: 10_000 }
end
