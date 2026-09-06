declare module 'jalaali-js' {
  export interface JalaaliDate {
    jy: number;
    jm: number;
    jd: number;
  }
  export interface GregorianDate {
    gy: number;
    gm: number;
    gd: number;
  }
  export function toJalaali(date: Date): JalaaliDate;
  export function toJalaali(jy: number, jm: number, jd: number): JalaaliDate;
  export function toGregorian(jy: number, jm: number, jd: number): GregorianDate;
  export function isLeapJalaaliYear(jy: number): boolean;
  export function jalaaliMonthLength(jy: number, jm: number): number;
  export function isValidJalaaliDate(jy: number, jm: number, jd: number): boolean;
}
