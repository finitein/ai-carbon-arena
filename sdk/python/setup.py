from setuptools import setup, find_packages

setup(
    name="carbon-arena-sdk",
    version="0.1.0",
    description="碳硅竞技场 Python SDK — AI Agent 对战客户端",
    long_description=open("README.md", encoding="utf-8").read() if __import__("os").path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    author="Carbon-Silicon Arena",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "websockets>=12.0",
    ],
    extras_require={
        "dev": ["pytest", "pytest-asyncio"],
    },
    entry_points={
        "console_scripts": [
            "carbon-arena=carbon_arena.cli:main",
        ],
    },
)
