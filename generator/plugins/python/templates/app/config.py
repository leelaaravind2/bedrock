"""Runtime configuration, read from the environment.

Values are supplied by docker-compose (see docker-compose.yml), with localhost
defaults so the app can also run directly. Standard 12-factor config — no
dependency on the tool that generated this project (Laws 19-21).
"""
import os


class Settings:
    pg_host: str = os.environ.get("PGHOST", "localhost")
    pg_port: int = int(os.environ.get("PGPORT", "__DB_PORT__"))
    pg_database: str = os.environ.get("PGDATABASE", "__DB_NAME__")
    pg_user: str = os.environ.get("PGUSER", "__DB_USER__")
    pg_password: str = os.environ.get("PGPASSWORD", "__DB_PASSWORD__")

    @property
    def database_url(self) -> str:
        return (
            f"__DB_SQLALCHEMY_URL_SCHEME__://{self.pg_user}:{self.pg_password}"
            f"@{self.pg_host}:{self.pg_port}/{self.pg_database}"
        )


settings = Settings()
