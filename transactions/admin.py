from django.contrib import admin
from .models import Category, Transaction, Budget, UserProfile

# Register your models here.
@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['description', 'amount', 'transaction_type', 'category', 'date', 'user']
    list_filter = ['transaction_type', 'category', 'date']
    search_fields = ['description', 'notes']
    date_hierarchy = 'date'

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    #note for all 'category' it was 'category_type' before
    list_display = ['name', 'category', 'user', 'color']
    list_filter = ['category']

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'amount', 'month', 'year']

admin.site.register(UserProfile)