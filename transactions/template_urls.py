# transactions/template_urls.py
# ADD these routes to your existing template_urls.py (or whatever file
# wires up your page views — merge with what you already have for /dashboard/).

from django.urls import path
from django.views.generic import TemplateView
# from django.utils.decorators import method_decorator

# NOTE: Since auth is JWT-based and checked client-side via requireAuth() in JS,
# these views just need to serve the HTML shell. Django's @login_required is NOT
# used here because there's no Django session — the JS guards each page on load.

urlpatterns = [

    path('', TemplateView.as_view(template_name='landing.html'), name='landing_page'),
    path('dashboard/', TemplateView.as_view(template_name='dashboard.html'), name='dashboard_page'),
    path('transactions/', TemplateView.as_view(template_name='transactions/list.html'), name='transactions_page'),
    path('categories/', TemplateView.as_view(template_name='transactions/categories.html'), name='categories_page'),
    path('budgets/', TemplateView.as_view(template_name='transactions/budgets.html'), name='budgets_page'),
    path('reports/', TemplateView.as_view(template_name='transactions/reports.html'), name='reports_page'),
    path('profile/', TemplateView.as_view(template_name='accounts/profile.html'), name='profile_page'),
]

# ---------------------------------------------------------------------------
# If your existing template_urls.py used function-based views instead of
# TemplateView (e.g. a render(request, 'dashboard.html') pattern), just
# add matching functions for each new page following that same pattern,
# pointing at the templates listed above.
# ---------------------------------------------------------------------------