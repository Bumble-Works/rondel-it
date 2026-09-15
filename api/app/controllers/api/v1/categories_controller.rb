module Api
  module V1
    class CategoriesController < ApplicationController
      def index
        categories = Category.order(:name)
        render json: { categories: categories.map { |category| CategorySerializer.call(category) } }
      end

      def create
        category = Category.new(category_params)
        if category.save
          render json: { category: CategorySerializer.call(category) }, status: :created
        else
          render json: { error: category.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      private

      def category_params
        params.permit(:name, :color)
      end
    end
  end
end
