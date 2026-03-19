from fastapi import Depends, HTTPException, status
from login.jwttoken import verify_token
from fastapi.security import OAuth2PasswordBearer
from models import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    return verify_token(token, credentials_exception)


def require_admin(current_user: TokenData = Depends(get_current_user)):
    """
    Blocks non-admins from admin-only endpoints.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
