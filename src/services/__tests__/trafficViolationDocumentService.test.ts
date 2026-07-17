import { describe, expect, it } from 'vitest';
import {
  buildTrafficViolationDocumentAssignments,
  findTrafficFileContractMatches,
  findTrafficFileVehicleMatches,
  normalizeTrafficFilePlate,
  plateFromTrafficFileName,
} from '../trafficViolationDocumentService';
import type { MatchedViolation } from '@/types/violations';

const violation = (overrides: Partial<MatchedViolation>): MatchedViolation => ({
  id: 'temp-1',
  violation_number: '3300000001',
  date: '2026-06-05',
  plate_number: '002766',
  violation_type: 'speeding',
  fine_amount: 500,
  match_confidence: 'high',
  status: 'matched',
  errors: [],
  warnings: [],
  ...overrides,
});

describe('buildTrafficViolationDocumentAssignments', () => {
  it('assigns each PDF only to contracts containing violations from that file', () => {
    const first = new File(['first'], '2766.pdf', { type: 'application/pdf', lastModified: 1 });
    const second = new File(['second'], '2774.pdf', { type: 'application/pdf', lastModified: 2 });
    const assignments = buildTrafficViolationDocumentAssignments([first, second], [
      violation({ contract_id: 'contract-a', source_file_key: '0:2766.pdf:5:1', source_file_name: '2766.pdf' }),
      violation({ id: 'temp-2', contract_id: 'contract-a', source_file_key: '0:2766.pdf:5:1', source_file_name: '2766.pdf' }),
      violation({ id: 'temp-3', contract_id: 'contract-b', plate_number: '002774', source_file_key: '1:2774.pdf:6:2', source_file_name: '2774.pdf' }),
    ]);

    expect(assignments).toHaveLength(2);
    expect(assignments.find(item => item.contractId === 'contract-a')).toMatchObject({
      file: first,
      violationCount: 2,
      plateNumbers: ['002766'],
    });
    expect(assignments.find(item => item.contractId === 'contract-b')).toMatchObject({
      file: second,
      violationCount: 1,
      plateNumbers: ['002774'],
    });
  });

  it('uses the single uploaded PDF for restored sessions without source metadata', () => {
    const file = new File(['report'], '2766.pdf', { type: 'application/pdf' });
    const assignments = buildTrafficViolationDocumentAssignments([file], [
      violation({ contract_id: 'contract-a' }),
    ]);

    expect(assignments).toHaveLength(1);
    expect(assignments[0].file).toBe(file);
  });
});

describe('traffic file matching', () => {
  it('matches a 2766.pdf filename to a stored 002766 plate', () => {
    expect(plateFromTrafficFileName('2766.pdf')).toBe('2766');
    expect(normalizeTrafficFilePlate('002766')).toBe('2766');

    const matches = findTrafficFileContractMatches(
      '2766',
      [{ id: 'vehicle-1', plate_number: '002766' }],
      [
        { vehicle_id: 'vehicle-1', vehicle_plate: null, contract_id: 'contract-a' },
        { vehicle_id: 'vehicle-1', vehicle_plate: '002766', contract_id: 'contract-a' },
        { vehicle_id: 'vehicle-1', vehicle_plate: '002766', contract_id: 'contract-b' },
      ]
    );

    expect(matches).toEqual([
      { contractId: 'contract-a', violationCount: 2 },
      { contractId: 'contract-b', violationCount: 1 },
    ]);
  });

  it('finds the vehicle itself when the plate has no contract match', () => {
    const matches = findTrafficFileVehicleMatches('2766', [
      { id: 'vehicle-1', plate_number: '002766' },
      { id: 'vehicle-2', plate_number: '2774' },
    ]);

    expect(matches).toEqual([{ id: 'vehicle-1', plate_number: '002766' }]);
  });

  it('resolves the same file to both its vehicle and matching contracts', () => {
    const vehicles = [{ id: 'vehicle-1', plate_number: '002766' }];
    const penalties = [
      { vehicle_id: 'vehicle-1', vehicle_plate: '002766', contract_id: 'contract-a' },
    ];

    expect(findTrafficFileVehicleMatches('2766', vehicles)).toHaveLength(1);
    expect(findTrafficFileContractMatches('2766', vehicles, penalties)).toEqual([
      { contractId: 'contract-a', violationCount: 1 },
    ]);
  });

  it('returns every duplicate plate so the importer can require review', () => {
    const matches = findTrafficFileVehicleMatches('002766', [
      { id: 'vehicle-1', plate_number: '2766' },
      { id: 'vehicle-2', plate_number: '002766' },
    ]);

    expect(matches.map(vehicle => vehicle.id)).toEqual(['vehicle-1', 'vehicle-2']);
  });
});
