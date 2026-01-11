import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const mockFetch = (data: unknown) =>
  jest.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response);

describe('App', () => {
  beforeEach(() => {
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders the main heading and tabs', () => {
    render(<App />);

    expect(screen.getByText('Pharma Blockchain MVP')).toBeInTheDocument();
    expect(screen.getByText('Add Medication')).toBeInTheDocument();
    expect(screen.getByText('View All')).toBeInTheDocument();
  });

  test('loads medications when switching to the view tab', async () => {
    const medications = [
      { serialNumber: 'SN-1', gtin: '1', batchNumber: 'B-1', expiryDate: '2030-01-01', qrHash: 'hash-1' },
    ];
    global.fetch = mockFetch(medications);

    render(<App />);

    fireEvent.click(screen.getByText('View All'));

    await waitFor(() => {
      expect(screen.getByText('SN-1')).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/medications');
  });

  test('toggles the QR modal when clicking the same Show QR button twice', async () => {
    const medications = [
      { serialNumber: 'SN-1', gtin: '1', batchNumber: 'B-1', expiryDate: '2030-01-01', qrHash: 'hash-1' },
    ];
    global.fetch = mockFetch(medications);

    render(<App />);
    fireEvent.click(screen.getByText('View All'));

    await waitFor(() => {
      expect(screen.getByText('Show QR')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show QR'));
    expect(screen.getByText('hash-1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show QR'));
    expect(screen.queryByText('hash-1')).not.toBeInTheDocument();
  });
});
