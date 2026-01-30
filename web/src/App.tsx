import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'


function App() {

  return (
    <>
    <h1>Welcome to Chat Heretics</h1>
      <SignedIn>
        <UserButton />
      </SignedIn>
     <SignedOut>
        <SignInButton mode="modal"/>
      </SignedOut>
    </>
  )
}

export default App
