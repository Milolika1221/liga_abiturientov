class DomainException(Exception):
    pass

class UserNotFoundException(DomainException):
    pass

class UnauthorizedAccessException(DomainException):
    pass

class InvalidUserDataException(DomainException):
    pass

class InvalidStateException(DomainException):
    pass

class StateNotFoundException(DomainException):
    pass

class DatabaseException(DomainException):
    pass

class ValidationException(DomainException):
    pass
