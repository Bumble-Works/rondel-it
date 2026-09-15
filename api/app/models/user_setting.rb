class UserSetting < ApplicationRecord
  validates :end_of_day_time, presence: true
  validates :timezone, presence: true

  def self.current
    first_or_create!
  end
end
