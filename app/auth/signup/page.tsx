'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Wrench } from 'lucide-react'

interface SignupForm {
  full_name: string
  email: string
  phone: string
  address: string
  company_name: string
  sub_store: string
  branch_code: string
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

    const { data, error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.full_name } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').update({
        full_name:    values.full_name,
        phone:        values.phone,
        address:      values.address,
        company_name: values.company_name,
        sub_store:    values.sub_store,
        branch_code:  values.branch_code.trim().toUpperCase(),
      }).eq('id', data.user.id)

      if (profileError?.message?.includes('unique') ||
          profileError?.message?.includes('branch_code')) {
        setError('That branch code is already in use. Please choose a different one.')
        setLoading(false)
        return
      }
    }

    router.push('/client')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Wrench className="text-brand-600" size={28} />
          <span className="text-2xl font-bold text-brand-600">ConnexServ</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Submit maintenance requests anytime.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="full_name"
              label="Contact Name"
              placeholder="Jane Smith"
              error={errors.full_name?.message}
              {...register('full_name', { required: 'Contact name is required' })}
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
            <Input
              id="company_name"
              label="Company Name"
              placeholder="Acme Corporation"
              error={errors.company_name?.message}
              {...register('company_name', { required: 'Company name is required' })}
            />
            <Input
              id="sub_store"
              label="Branch / Sub-Store"
              placeholder="e.g. Cape Town Branch"
              error={errors.sub_store?.message}
              {...register('sub_store', { required: 'Branch name is required' })}
            />
            <div>
              <Input
                id="branch_code"
                label="Branch Code"
                placeholder="e.g. CPT001"
                error={errors.branch_code?.message}
                {...register('branch_code', {
                  required: 'Branch code is required',
                  pattern: { value: /^[A-Za-z0-9]+$/, message: 'Letters and numbers only' },
                })}
              />
              <p className="mt-1 text-xs text-gray-400">
                Unique identifier — your regional manager uses this to link your store.
              </p>
            </div>
            <Input
              id="address"
              label="Address"
              placeholder="123 Main St, Cape Town"
              error={errors.address?.message}
              {...register('address', { required: 'Address is required' })}
            />
            <PasswordInput
              id="password"
              label="Password"
              placeholder="Minimum 8 characters"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
              })}
            />
            <PasswordInput
              id="confirm_password"
              label="Confirm Password"
              placeholder="Repeat your password"
              error={errors.confirm_password?.message}
              {...register('confirm_password', {
                required: 'Please confirm your password',
                validate: val => val === watch('password') || 'Passwords do not match',
              })}
            />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
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
