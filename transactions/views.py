from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.utils import timezone
import datetime

from .models import Category, Transaction, Budget, UserProfile
from .serializers import CategorySerializer, TransactionSerializer, BudgetSerializer, UserProfileSerializer
from .filters import TransactionFilter



# Create your views here.
class CategoryViewSet(viewsets.ModelViewSet):
    """
        API endpoint for categories.
        Automatically handles: GET /categories/, POST /categories/,
        GET /categories/{id}/, PUT /categories/{id}/, DELETE /categories/{id}/
    """
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        #CRITICAL: Users only see their own categories
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        #Automatically assign the logged-in user
        serializer.save(user=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = TransactionFilter
    search_fields = ['description', 'notes']
    ordering_fields = ['date', 'amount', 'created_at']

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related('category') #Optimization: avoids N+1 queries

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        GET /api/transactions/summary/
        Return total income, expenses, and balance for the current month.
        """
        today = timezone.now().date()
        month_start = today.replace(day=1)

        transactions = self.get_queryset().filter(
            date__gte=month_start,
            date__lte=today
        )

        income = transactions.filter(
            transaction_type='income'
        ).aggregate(total=Sum('amount'))['total'] or 0

        expenses = transactions.filter(
            transaction_type='expense'
        ).aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'month': today.strftime('%B %Y'),
            'total_income': float(income),
            'total_expenses': float(expenses),
            'balance': float(income) - float(expenses),
            'transaction_count': transactions.count()
        })

    @action(detail=False, methods=['get'], url_path='by-category')
    def by_category(self, request):
        """
        GET /api/transactions/by-category/?year=2025&month=6
        Returns spending grouped by category (for pie chart).
        """
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month', timezone.now().month)

        data = self.get_queryset().filter(
            transaction_type='expense',
            date__year=year,
            date__month=month
        ).values(
            'category__name',
            'category__color'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        return Response(list(data))

    @action(detail=False, methods=['get'], url_path='monthly-trend')
    def monthly_trend(self, request):
        """
            GET /api/transactions/monthly-trend/
            Returns income vs expense totals for the last 6 months (for bar chart).
        """
        today = timezone.now().date()
        results = []

        for i in range(5,-1,-1): # 5 months ago to current month
            month_date = today.replace(day=1) - datetime.timedelta(days=i*30)
            month_date = month_date.replace(day=1)

            month_transactions = self.get_queryset().filter(
                date__year=month_date.year,
                date__month=month_date.month
            )
            income = month_transactions.filter(
                transaction_type='income'
            ).aggregate(total=Sum('amount'))['total'] or 0
            expenses = month_transactions.filter(
                transaction_type='expense'
            ).aggregate(total=Sum('amount'))['total'] or 0

            results.append({
                'month': month_date.strftime('%b %Y'),
                'income': float(income),
                'expenses': float(expenses)
            })
        return Response(results)

class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user).select_related('category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='current-month')
    def current_month(self, request):
        """Returns all budgets for the current month with spending progress."""
        today = timezone.now().date()
        budgets = self.get_queryset().filter(
            month=today.month,
            year=today.year
        )
        serializer = self.get_serializer(budgets, many=True)
        return Response(serializer.data)
