from rest_framework import serializers
from .models import Category, Transaction, Budget, UserProfile


class CategorySerializer(serializers.ModelSerializer):
    transaction_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'category', 'color', 'icon', 'is_default', 'transaction_count', 'created_at'
        ] # category_type -> category
        read_only_fields = ['id', 'created_at', 'is_default']

    def get_transaction_count(self, obj):
        return obj.transactions.count()

    def validate_color(self, value):
        """Ensure color is a valid hex code."""
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}$', value):
            raise serializers.ValidationError(
                "Color must be a valid hex code like #ff5733"
            )
        return value


class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'amount', 'transaction_type', 'description', 'date', 'notes', 'category', 'category_name', 'category_color', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_amount(self, value):
        """Amounts must always be positive."""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, data):
        """Category type must match transaction type."""
        category = data.get('category')
        transaction_type = data.get('transaction_type')
        if category and category.category_type != transaction_type:
            raise serializers.ValidationError(
                f"Category '{category.name}' is for {category.category_type} "
                f"but transaction type is {transaction_type}."
            )
        return data

class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    spent = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'category_color', 'amount', 'month', 'year', 'spent', 'percentage_used', 'remaining', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_spent(self, obj):
        return float(obj.get_spent())

    def get_percentage_used(self, obj):
        return obj.get_percentage_used()

    def get_remaining(self, obj):
        return float(obj.amount) - float(obj.get_spent())

    def validate(self, data):
        month = data.get('month')
        if month and not (1 <= month <= 12):
            raise serializers.ValidationError("Month must be between 1 and 12.")
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['username', 'email', 'first_name', 'last_name', 'currency', 'avatar']