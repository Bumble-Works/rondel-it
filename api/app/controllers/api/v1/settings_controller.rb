module Api
  module V1
    class SettingsController < ApplicationController
      def show
        render json: { settings: UserSettingSerializer.call(UserSetting.current) }
      end

      def update
        settings = UserSetting.current
        if settings.update(settings_params)
          render json: { settings: UserSettingSerializer.call(settings) }
        else
          render json: { error: settings.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      private

      def settings_params
        params.permit(:end_of_day_time, :timezone)
      end
    end
  end
end
