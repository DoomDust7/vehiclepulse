export const PID_META: Record<string, { min: number; max: number }> = {
  '04': { min: 0,    max: 100   },   // engine load %
  '05': { min: -40,  max: 215   },   // coolant temp C
  '06': { min: -100, max: 100   },   // STFT %
  '0B': { min: 0,    max: 255   },   // MAP kPa
  '0C': { min: 0,    max: 8000  },   // RPM
  '0D': { min: 0,    max: 220   },   // speed km/h
  '0F': { min: -40,  max: 215   },   // intake air temp C
  '10': { min: 0,    max: 50    },   // MAF g/s
  '11': { min: 0,    max: 100   },   // throttle %
  '14': { min: 0,    max: 1.275 },   // O2 sensor 1 V
  '15': { min: 0,    max: 1.275 },   // O2 sensor 2 V
}

export const PID_ORDER = ['0C', '05', '0D', '10', '11', '04', '0B', '0F', '14', '15', '06']
