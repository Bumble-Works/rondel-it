class UserSettingSerializer
  def self.call(user_setting)
    SerializerHelpers.deep_camelize(
      {
        id: user_setting.id,
        end_of_day_time: user_setting.end_of_day_time.strftime("%H:%M"),
        timezone: user_setting.timezone,
        created_at: user_setting.created_at,
        updated_at: user_setting.updated_at
      }
    )
  end
end
