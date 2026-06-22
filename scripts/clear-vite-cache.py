import shutil, os
vite_cache = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'node_modules', '.vite')
shutil.rmtree(vite_cache, ignore_errors=True)
print(f"Cleared: {vite_cache}")
print(f"Exists after: {os.path.exists(vite_cache)}")