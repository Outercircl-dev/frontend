import { validateActivityCreationInput } from '@/src/utils/activityCreationValidation'

describe('validateActivityCreationInput', () => {
  it('rejects invalid address values', () => {
    const result = validateActivityCreationInput({
      address: '123456',
      placeId: 'test_place_1',
      activityDate: '2099-12-31',
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'UTC',
    })

    expect(result).toBe('Enter a valid location address using standard address characters.')
  })

  it('requires selecting a place from Google suggestions', () => {
    const result = validateActivityCreationInput({
      address: '221B Baker Street',
      placeId: '',
      activityDate: '2099-12-31',
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'UTC',
    })

    expect(result).toBe('Select a location from Google suggestions.')
  })

  it('rejects when end time is not after start time', () => {
    const result = validateActivityCreationInput({
      address: '221B Baker Street',
      placeId: 'test_place_1',
      activityDate: '2099-12-31',
      startTime: '11:00',
      endTime: '11:00',
      timezone: 'UTC',
    })

    expect(result).toBe('End time must be after start time.')
  })

  it('rejects past date/time in the selected timezone', () => {
    const result = validateActivityCreationInput({
      address: '221B Baker Street',
      placeId: 'test_place_1',
      activityDate: '2000-01-01',
      startTime: '00:00',
      endTime: '01:00',
      timezone: 'UTC',
    })

    expect(result).toBe('Activity start date/time must be in the future.')
  })

  it('accepts a valid future payload', () => {
    const result = validateActivityCreationInput({
      address: '221B Baker Street',
      placeId: 'test_place_1',
      activityDate: '2099-12-31',
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'UTC',
    })

    expect(result).toBeNull()
  })

  it('accepts unicode characters in Google-formatted addresses', () => {
    const result = validateActivityCreationInput({
      address: 'Dún Laoghaire, County Dublin, Ireland',
      placeId: 'test_place_1',
      activityDate: '2099-12-31',
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'UTC',
    })

    expect(result).toBeNull()
  })
})
