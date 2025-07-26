/**
 * Version utility for comparing semantic versions
 */
export class Version {
  constructor(
    public readonly version: string,
    public readonly revision: number = 0
  ) {}

  /**
   * Compare this version to another version
   * @param other The other version to compare to
   * @returns -1 if this < other, 0 if equal, 1 if this > other
   */
  compareTo(other: Version): number {
    const v1 = new ComparableVersion(this.version)
    const v2 = new ComparableVersion(other.version)
    const comparison = v1.compareTo(v2)

    if (comparison === 0) {
      return Math.sign(this.revision - other.revision)
    }

    return comparison
  }

  /**
   * Convert the version to a string
   */
  toString(): string {
    return `${this.version}${this.revision > 0 ? '.' + this.revision : ''}`
  }
}

/**
 * Helper class for comparing versions
 */
class ComparableVersion {
  private items: number[]

  constructor(private value: string) {
    this.items = this.parseVersion(value)
  }

  private parseVersion(version: string): number[] {
    return version.split('.').map((item) => parseInt(item, 10) || 0)
  }

  compareTo(other: ComparableVersion): number {
    const len = Math.max(this.items.length, other.items.length)

    for (let i = 0; i < len; i++) {
      const a = this.items[i] || 0
      const b = other.items[i] || 0

      if (a !== b) {
        return a < b ? -1 : 1
      }
    }

    return 0
  }

  toString(): string {
    return this.value
  }
}
