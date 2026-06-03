'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Wrench } from 'lucide-react'

interface SignupForm {
  full_name: string
  email: string
  phone: string
  address: string
  company_name: string
  sub_store: string
  password: string
  confirm_password: string
}

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupForm>()

  async function onSubmit(values: SignupForm) {
    setLoading(true)
    setError('')

    const supabase = createClient()

    // 1. Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // 2. Update profile with all fields
    if (data.user) {
      await supabase.from('profiles').update({
        full_name:    values.full_name,
        phone:        values.phone,
        address:      values.address,
        company_name: values.company_name,
        sub_store:    values.sub_store,
      }).eq('id', data.user.id)
    }

    router.push('/client')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Wrench className="text-brand-600" size={28} />
          <span className="text-2xl font-bold text-brand-600">ConnexServ</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">Submit maintenance requests anytime.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Personal */}
            <Input
              id="full_name"
              label="Full Name"
              placeholder="Jane Smith"
              error={errors.full_name?.message}
              {...register('full_name', { required: 'Full name is required' })}
            />
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="jane@company.com"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />
            <Input
              id="phone"
              type="tel"
              label="Phone Number"
              placeholder="+27 71 234 5678"
              error={errors.phone?.message}
              {...register('phone', { required: 'Phone number is required' })}
            />

            {/* Company */}
            <Input
              id="company_name"
              label="Company Name"
              placeholder="Acme Corporation"
              error={errors.company_name?.message}
              {...register('company_name', { required: 'Company name is required' })}
            />
            <Input
              id="sub_store"
              label="Sub Store / Branch"
              placeholder="e.g. Cape Town Branch"
              error={errors.sub_store?.message}
              {...register('sub_store', { required: 'Sub store is required' })}
            />
            <Input
              id="address"
              label="Address"
              placeholder="123 Main St, Cape Town"
              error={errors.address?.message}
              {...register('address', { required: 'Address is required' })}
            />

            {/* Password */}
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Minimum 8 characters"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
              })}
            />
            <Input
              id="confirm_password"
              type="password"
              label="Confirm Password"
              placeholder="Repeat your password"
              error={errors.confirm_password?.message}
              {...register('confirm_password', {
                required: 'Please confirm your password',
                validate: val => val === watch('password') || 'Passwords do not match',
              })}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
