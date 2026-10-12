import os
import platform
import time

# --- CONFIGURATION & ALLOWLIST RULES ---
HOSTS_PATH = (
    r"C:\Windows\System32\drivers\etc\hosts"
    if platform.system() == "Windows"
    else "/etc/hosts"
)
REDIRECT_IP = "127.0.0.1"

# Distraction domains to block completely at system level
BLOCKED_SITES = [
    "facebook.com",
    "www.facebook.com",
    "instagram.com",
    "www.instagram.com",
    "tiktok.com",
    "www.tiktok.com",
    "twitter.com",
    "x.com",
    "netflix.com",
    "www.netflix.com",
    "twitch.tv",
    "www.twitch.tv",
]

# Keywords allowed for YouTube (Printer repair, IT networking, BYU-Pathway schoolwork)
WORK_KEYWORDS = [
    "printer",
    "repair",
    "fix",
    "canon",
    "hp",
    "epson",
    "brother",
    "fuser",
    "toner",
    "formatter",
    "error code",
    "network",
    "router",
    "switch",
    "byu",
    "pathway",
    "python",
    "coding",
    "cedar3",
    "sage",
    "tutorial",
]


def enforce_hosts_blocking():
  """Appends blocked sites to Windows hosts file."""
  try:
    with open(HOSTS_PATH, "r+") as file:
      content = file.read()
      for site in BLOCKED_SITES:
        if site not in content:
          file.write(f"\n{REDIRECT_IP} {site}")
    print("[NetGuard] System DNS rules enforced: Distractions blocked.")
  except PermissionError:
    print(
        "[NetGuard ERROR] Please run this script as Administrator to enforce"
        " blocking!"
    )


def inspect_youtube_focus():
  """Checks active window title for work-related YouTube usage."""
  try:
    import pygetwindow as gw  # pip install pygetwindow

    active_win = gw.getActiveWindow()
    if active_win and "YouTube" in active_win.title:
      title_lower = active_win.title.lower()

      # Check if title contains any allowed work/school keyword
      is_work_related = any(kw in title_lower for kw in WORK_KEYWORDS)

      if not is_work_related:
        print(
            f"[WARNING] Non-work YouTube activity detected: '{active_win.title}'"
        )
        # Gently warn or minimize/close distraction window
        active_win.close()
        print("[NetGuard] Closed non-work video tab.")
  except Exception as e:
    pass


if __name__ == "__main__":
  print(
      "Cedar3 Technology - Internet Focus Guard Starting (Press Ctrl+C to stop)..."
  )
  enforce_hosts_blocking()

  while True:
    inspect_youtube_focus()
    time.sleep(3)  # Check every 3 seconds