Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      get "days/:date/tasks", to: "days#tasks"

      resources :tasks, only: [:create, :update] do
        member do
          post :advance
          post :rondel
          put :note
          get :events
        end
      end

      resources :categories, only: [:index, :create]
      resource :settings, only: [:show, :update]
    end
  end
end
