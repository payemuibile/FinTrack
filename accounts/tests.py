from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase


class AuthEndpointTests(APITestCase):
    def test_register_login_refresh_and_profile_endpoints(self):
        register_payload = {
            'username': 'apiuser',
            'email': 'apiuser@example.com',
            'first_name': 'API',
            'last_name': 'User',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
        }

        register_response = self.client.post(
            '/api/auth/register/',
            register_payload,
            format='json',
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(register_response.data['username'], 'apiuser')

        login_response = self.client.post(
            '/api/auth/login/',
            {
                'username': 'apiuser',
                'password': 'StrongPass123!',
            },
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_response.data)
        self.assertIn('refresh', login_response.data)
        self.assertEqual(login_response.data['user']['username'], 'apiuser')

        refresh_response = self.client.post(
            '/api/auth/token/refresh/',
            {'refresh': login_response.data['refresh']},
            format='json',
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )
        profile_response = self.client.get('/api/auth/profile/')
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data['username'], 'apiuser')

        update_response = self.client.patch(
            '/api/auth/profile/',
            {'currency': 'NGN'},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['currency'], 'NGN')

    def test_protected_profile_requires_authentication(self):
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(
            username='existing',
            email='taken@example.com',
            password='StrongPass123!',
        )

        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'another',
                'email': 'taken@example.com',
                'first_name': 'Another',
                'last_name': 'User',
                'password': 'StrongPass123!',
                'password_confirm': 'StrongPass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
