"""
VK Bot with Clean Architecture

Educational institution bot for VKontakte implemented using Clean Architecture principles.
"""

__version__ = "1.0.0"
__author__ = "VK Bot Team"
__description__ = "VK Bot with Clean Architecture for educational institution"

# Export main components
from .domain import *
from .db import *
from .state import *
from .application import *
from .presentation import *
from .config import *

__all__ = [
    # Version info
    "__version__", "__author__", "__description__",
    
    # Main entry point
    "main"
]
