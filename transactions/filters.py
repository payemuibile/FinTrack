import django_filters
from .models import Transaction

class TransactionFilter(django_filters.FilterSet):
    #Allow filtering by date range: ?date_after=2025-01-01&date_before=2025-01-31
    date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    min_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    month = django_filters.NumberFilter(field_name='date', lookup_expr='month')
    year = django_filters.NumberFilter(field_name='date', lookup_expr='year')

    class Meta:
        model = Transaction
        fields = ['transaction_type', 'category', 'date_after', 'date_before']