/**
 * CDN External Library Loader
 * Loads heavy libraries from CDN on-demand to reduce bundle size
 */

interface LibraryConfig {
  name: string;
  url: string;
  integrity?: string;
  global?: string;
  version?: string;
}

// CDN URLs for external libraries
const CDN_LIBRARIES: Record<string, LibraryConfig> = {
  // Charts
  recharts: {
    name: 'recharts',
    url: 'https://unpkg.com/recharts@2.8.0/umd/recharts.min.js',
    integrity: 'sha384-xyz', // Add actual integrity hash
    global: 'Recharts'
  },

  // PDF Generation
  jspdf: {
    name: 'jspdf',
    url: 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
    integrity: 'sha384-xyz',
    global: 'jspdf'
  },
  jspdfAutotable: {
    name: 'jspdfAutotable',
    url: 'https://unpkg.com/jspdf-autotable@3.5.31/dist/jspdf.plugin.autotable.min.js',
    integrity: 'sha384-xyz',
    global: 'jspdfAutoTable'
  },

  // Excel Libraries
  xlsx: {
    name: 'xlsx',
    url: 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
    integrity: 'sha384-xyz',
    global: 'XLSX'
  },

  // Maps
  leaflet: {
    name: 'leaflet',
    url: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    integrity: 'sha384-xyz',
    global: 'L'
  },

  // 3D Libraries
  three: {
    name: 'three',
    url: 'https://unpkg.com/three@0.158.0/build/three.min.js',
    integrity: 'sha384-xyz',
    global: 'THREE'
  },

  // Date Pickers
  datePicker: {
    name: 'datePicker',
    url: 'https://unpkg.com/react-datepicker@4.21.0/dist/react-datepicker.min.js',
    integrity: 'sha384-xyz'
  },

  // CSV Parsing
  papaparse: {
    name: 'papaparse',
    url: 'https://unpkg.com/papaparse@5.4.1/papaparse.min.js',
    integrity: 'sha384-xyz',
    global: 'PapaParse'
  }
};

class CDNLoader {
  private loadedLibraries = new Set<string>();
  private loadingPromises = new Map<string, Promise<any>>();
  private scriptElements = new Map<string, HTMLScriptElement>();

  /**
   * Load a library from CDN
   */
  async loadLibrary(libraryName: string): Promise<any> {
    // Return if already loaded
    if (this.loadedLibraries.has(libraryName)) {
      return this.getLibrary(libraryName);
    }

    // Return existing loading promise
    if (this.loadingPromises.has(libraryName)) {
      return this.loadingPromises.get(libraryName);
    }

    const config = CDN_LIBRARIES[libraryName];
    if (!config) {
      throw new Error(`Library ${libraryName} not found in CDN configuration`);
    }

    // Create loading promise
    const loadingPromise = this.loadScript(config);
    this.loadingPromises.set(libraryName, loadingPromise);

    try {
      const library = await loadingPromise;
      this.loadedLibraries.add(libraryName);
      return library;
    } catch (error) {
      this.loadingPromises.delete(libraryName);
      throw error;
    }
  }

  /**
   * Load multiple libraries in parallel
   */
  async loadLibraries(libraryNames: string[]): Promise<any[]> {
    const promises = libraryNames.map(name => this.loadLibrary(name));
    return Promise.all(promises);
  }

  /**
   * Preload libraries for better performance
   */
  preloadLibraries(libraryNames: string[]): void {
    // Start loading in background without awaiting
    libraryNames.forEach(name => {
      this.loadLibrary(name).catch(error => {
        console.warn(`Failed to preload ${name}:`, error);
      });
    });
  }

  /**
   * Check if library is loaded
   */
  isLoaded(libraryName: string): boolean {
    return this.loadedLibraries.has(libraryName);
  }

  /**
   * Get loaded library from window object
   */
  private getLibrary(libraryName: string): any {
    const config = CDN_LIBRARIES[libraryName];
    if (config?.global) {
      return (window as any)[config.global];
    }
    return null;
  }

  /**
   * Load script with integrity check
   */
  private loadScript(config: LibraryConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      if (this.scriptElements.has(config.name)) {
        resolve(this.getLibrary(config.name));
        return;
      }

      const script = document.createElement('script');
      script.src = config.url;
      script.async = true;

      // Add integrity check if provided
      if (config.integrity) {
        script.crossOrigin = 'anonymous';
        script.integrity = config.integrity;
      }

      script.onload = () => {
        this.scriptElements.set(config.name, script);
        const library = this.getLibrary(config.name);

        if (library) {
          resolve(library);
        } else {
          // For libraries without global variable, return success
          resolve(true);
        }
      };

      script.onerror = () => {
        document.head.removeChild(script);
        this.scriptElements.delete(config.name);
        reject(new Error(`Failed to load ${config.name} from CDN`));
      };

      // Add timeout
      const timeout = setTimeout(() => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
          this.scriptElements.delete(config.name);
        }
        reject(new Error(`Timeout loading ${config.name}`));
      }, 10000); // 10 second timeout

      script.addEventListener('load', () => clearTimeout(timeout));
      script.addEventListener('error', () => clearTimeout(timeout));

      document.head.appendChild(script);
    });
  }

  /**
   * Unload a library (cleanup)
   */
  unloadLibrary(libraryName: string): void {
    if (this.scriptElements.has(libraryName)) {
      const script = this.scriptElements.get(libraryName)!;
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      this.scriptElements.delete(libraryName);
    }
    this.loadedLibraries.delete(libraryName);
    this.loadingPromises.delete(libraryName);
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      loaded: this.loadedLibraries.size,
      loading: this.loadingPromises.size,
      total: Object.keys(CDN_LIBRARIES).length
    };
  }
}

// Create singleton instance
export const cdnLoader = new CDNLoader();

// Preload commonly used libraries
if (typeof window !== 'undefined') {
  // Preload after initial page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      cdnLoader.preloadLibraries(['recharts', 'leaflet']);
    }, 2000);
  });
}

// Convenience functions for specific libraries
export const loadCharts = () => cdnLoader.loadLibrary('recharts');
export const loadPDF = () => cdnLoader.loadLibraries(['jspdf', 'jspdfAutotable']);
export const loadExcel = () => cdnLoader.loadLibrary('xlsx');
export const loadMaps = () => cdnLoader.loadLibrary('leaflet');
export const load3D = () => cdnLoader.loadLibrary('three');
export const loadCSV = () => cdnLoader.loadLibrary('papaparse');

export default cdnLoader;