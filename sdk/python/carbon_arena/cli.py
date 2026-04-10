"""
CLI for local sandbox testing.
"""

import sys
import logging


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    if len(sys.argv) < 2:
        print("碳硅竞技场 SDK CLI")
        print()
        print("用法:")
        print("  carbon-arena run <agent_file.py>   运行你的 Agent")
        print("  carbon-arena sandbox               启动本地沙盒测试")
        print("  carbon-arena version                显示版本号")
        print()
        sys.exit(0)

    command = sys.argv[1]

    if command == "version":
        from carbon_arena import __version__
        print(f"carbon-arena-sdk v{__version__}")

    elif command == "run":
        if len(sys.argv) < 3:
            print("错误: 请指定 Agent 文件路径")
            print("用法: carbon-arena run my_agent.py")
            sys.exit(1)

        agent_file = sys.argv[2]
        print(f"运行 Agent: {agent_file}")
        # Execute the agent file
        exec(open(agent_file, encoding="utf-8").read())

    elif command == "sandbox":
        print("🎮 本地沙盒模式 (开发中)")
        print("将在本地启动一个模拟服务器，让你的 Agent 与基线 Bot 对战")
        # TODO: Start local sandbox server

    else:
        print(f"未知命令: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
