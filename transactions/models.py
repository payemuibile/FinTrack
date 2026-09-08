from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save


# Create your models here.
class Category(models.Model):
    """
        Represents a spending/income category like 'Food', 'Salary', 'Transport'.
        Each user gets their own set of categories.
    """
    #Choices for category type
    INCOME = 'income'
    EXPENSE = 'expense'
    TYPES_CHOICES = [
        (INCOME, 'Income'),
        (EXPENSE, 'Expense'),
    ]
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  #Delete categories if user is deleted
        related_name='categories'
    )
    name = models.CharField(max_length=100)
    category_type = models.CharField(
        max_length=10,
        choices=TYPES_CHOICES,
        default=EXPENSE
    )
    color = models.CharField(
        max_length=7,
        default='#6c757d',
        help_text='Hex color code, e.g. #FF5733'
    )
    icon = models.CharField(
        max_length=50,
        default='bi-tag',
        help_text='True for system-seeded categories'
    )
    is_default = models.BooleanField(
        default=False,
        help_text='True for system-seeded categories'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']
        #Prevent duplicate category names per user
        unique_together = ['user', 'name']

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Transaction(models.Model):
    """
        A single financial event — either money coming in (income) or going out (expense).
        This is the core model of the entire application.
    """
    INCOME = 'income'
    EXPENSE = 'expense'
    TYPES_CHOICES = [
        (INCOME, 'Income'),
        (EXPENSE, 'Expense'),
    ]
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL, #Keep transaction if category deleted
        null=True,
        blank=True,
        related_name='transactions'
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Always store as positive number'
    )
    transaction_type = models.CharField(
        max_length=10,
        choices=TYPES_CHOICES,
    )
    description = models.CharField(max_length=255, blank=True)
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']  #Newest first

    def __str__(self):
        sign = '+' if self.transaction_type == self.INCOME else '-'
        return f"{sign}{self.amount} - {self.description} ({self.date})"

class Budget(models.Model):
    """
        A monthly spending target for a specific category.
        Example: "Spend no more than $300 on Food in June 2025"
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='budgets'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='budgets'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    month = models.IntegerField(help_text='1-12')
    year = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        #One budget per category per month per user
        unique_together = ['user', 'category', 'month', 'year']

    def __str__(self):
        return f"{self.user.username} | {self.category.name} | {self.month}/{self.year} - ${self.amount}"

    def get_spent(self):
        """Calculate how much has been spent in this budget's category/month."""
        from django.db.models import Sum
        result = Transaction.objects.filter(
            user=self.user,
            category=self.category,
            transaction_type=Transaction.EXPENSE,
            date__month=self.month,
            date__year=self.year
        ).aggregate(total=Sum('amount'))
        return result['total'] or 0

    def get_percentage_used(self):
        """Returns 0-100+ percentage of budget consumed."""
        if self.amount == 0:
            return 0
        return round((self.get_spent() / self.amount) * 100, 1)

class UserProfile(models.Model):
    """
        Extends Django's built-in User model with finance-specific settings.
        Uses OneToOneField — every User has exactly one UserProfile.
    """
    CURRENCY_CHOICES = [
        ('USD', '$ US Dollar'),
        ('EUR', '€ Euro'),
        ('GBP', '£ British Pound'),
        ('NGN', '₦ Nigerian Naira'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='NGN'
    )
    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Profile of {self.user.username}"

#using the Django signals to automatically create a profile for a new user
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically creates a UserProfile when a new User is saved."""
    if created:
        UserProfile.objects.create(user=instance)
        seed_default_categories(instance)

def seed_default_categories(user):
    """Creates a standard set of categories for every new user."""

    defaults = [
        # (name, type, color, icon)
        ('Salary', 'income', '#28a745', 'bi-briefcase'),
        ('Food & Dining', 'expense', '#fd7e14', 'bi-cup-straw'),
        ('Transport', 'expense', '#6f42c1', 'bi-car-front'),
        ('Housing & Rent', 'expense', '#dc3545', 'bi-house'),
        ('Healthcare', 'expense', '#e83e8c', 'bi-heart-pulse'),
        ('Entertainment', 'expense', '#ffc107', 'bi-controller'),
        ('Shopping', 'expense', '#20c997', 'bi-bag'),
        ('Education', 'expense', '#0d6efd', 'bi-book'),
        ('Utilities', 'expense', '#6c757d', 'bi-lightning'),
    ]
    for name, cat_type, color, icon in defaults:
        Category.objects.get_or_create(
            user=user,
            name=name,
            defaults={
                'category_type': cat_type,
                'color': color,
                'icon': icon,
                'is_default': True,
            }
        )


