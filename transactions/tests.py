from datetime import date

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Budget, Category, Transaction


class TransactionApiEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester',
            email='tester@example.com',
            password='StrongPass123!',
        )
        self.client.force_authenticate(user=self.user)
        self.expense_category = Category.objects.get(
            user=self.user,
            name='Food & Dining',
        )

    def test_category_crud_endpoints(self):
        list_response = self.client.get('/api/categories/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertIn('results', list_response.data)

        create_response = self.client.post(
            '/api/categories/',
            {
                'name': 'Gifts',
                'category': 'expense',
                'color': '#123abc',
                'icon': 'bi-gift',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        category_id = create_response.data['id']

        detail_response = self.client.get(f'/api/categories/{category_id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data['name'], 'Gifts')

        patch_response = self.client.patch(
            f'/api/categories/{category_id}/',
            {'color': '#abcdef'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['color'], '#abcdef')

        delete_response = self.client.delete(f'/api/categories/{category_id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_transaction_crud_and_report_endpoints(self):
        create_response = self.client.post(
            '/api/transactions/',
            {
                'amount': '25.50',
                'transaction_type': 'expense',
                'description': 'Lunch',
                'date': date.today().isoformat(),
                'notes': 'API test transaction',
                'category': self.expense_category.id,
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        transaction_id = create_response.data['id']

        list_response = self.client.get('/api/transactions/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertIn('results', list_response.data)

        detail_response = self.client.get(f'/api/transactions/{transaction_id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data['description'], 'Lunch')

        patch_response = self.client.patch(
            f'/api/transactions/{transaction_id}/',
            {'description': 'Team lunch'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['description'], 'Team lunch')

        summary_response = self.client.get('/api/transactions/summary/')
        self.assertEqual(summary_response.status_code, status.HTTP_200_OK)
        self.assertIn('total_expenses', summary_response.data)
        self.assertIn('balance', summary_response.data)

        by_category_response = self.client.get('/api/transactions/by-category/')
        self.assertEqual(by_category_response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(by_category_response.data, list)

        trend_response = self.client.get('/api/transactions/monthly-trend/')
        self.assertEqual(trend_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(trend_response.data), 6)

        delete_response = self.client.delete(
            f'/api/transactions/{transaction_id}/'
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_transaction_rejects_category_type_mismatch(self):
        response = self.client.post(
            '/api/transactions/',
            {
                'amount': '100.00',
                'transaction_type': 'income',
                'description': 'Invalid category type',
                'date': date.today().isoformat(),
                'category': self.expense_category.id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Food & Dining', str(response.data))

    def test_budget_crud_and_current_month_endpoint(self):
        today = date.today()

        create_response = self.client.post(
            '/api/budgets/',
            {
                'category': self.expense_category.id,
                'amount': '500.00',
                'month': today.month,
                'year': today.year,
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        budget_id = create_response.data['id']

        list_response = self.client.get('/api/budgets/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertIn('results', list_response.data)

        detail_response = self.client.get(f'/api/budgets/{budget_id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data['category'], self.expense_category.id)

        current_month_response = self.client.get('/api/budgets/current-month/')
        self.assertEqual(current_month_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(current_month_response.data), 1)

        patch_response = self.client.patch(
            f'/api/budgets/{budget_id}/',
            {'amount': '600.00'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['amount'], '600.00')

        delete_response = self.client.delete(f'/api/budgets/{budget_id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_protected_transaction_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)

        for url in [
            '/api/categories/',
            '/api/transactions/',
            '/api/transactions/summary/',
            '/api/budgets/',
        ]:
            response = self.client.get(url)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                url,
            )

    def test_created_records_are_scoped_to_authenticated_user(self):
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='StrongPass123!',
        )
        Category.objects.create(
            user=other_user,
            name='Other Category',
            category='expense',
            color='#111111',
        )
        Transaction.objects.create(
            user=other_user,
            category=Category.objects.get(user=other_user, name='Other Category'),
            amount='10.00',
            transaction_type='expense',
            description='Other transaction',
            date=date.today(),
        )
        Budget.objects.create(
            user=other_user,
            category=Category.objects.get(user=other_user, name='Other Category'),
            amount='100.00',
            month=date.today().month,
            year=date.today().year,
        )

        category_response = self.client.get('/api/categories/')
        transaction_response = self.client.get('/api/transactions/')
        budget_response = self.client.get('/api/budgets/')

        category_names = [
            item['name'] for item in category_response.data['results']
        ]
        transaction_descriptions = [
            item['description'] for item in transaction_response.data['results']
        ]
        budget_category_names = [
            item['category_name'] for item in budget_response.data['results']
        ]

        self.assertNotIn('Other Category', category_names)
        self.assertNotIn('Other transaction', transaction_descriptions)
        self.assertNotIn('Other Category', budget_category_names)
